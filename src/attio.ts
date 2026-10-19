// Attio: reads for the agent, the call context, and the writes that run after a button tap.
import { ApiError, DRY_RUN, env, http } from "./net.ts";
import { type Person, type Plan, type Rules, type Specs, participants, route, shouldProcess } from "./plan.ts";

const BASE = "https://api.attio.com/v2";
const WRITABLE = new Set(["text", "number", "select", "status", "currency", "checkbox", "date"]);
const DEAL_SYSTEM_FIELDS = new Set(["stage", "value"]);

export async function attio(method: string, path: string, opts: { json?: unknown; query?: Record<string, any>; retries?: number } = {}) {
	const isWrite = method !== "GET" && !path.endsWith("/query") && !path.endsWith("/search");
	if (DRY_RUN && isWrite) throw new ApiError(`DRY_RUN: refused ${method} ${path}`);
	const q = opts.query ? `?${new URLSearchParams(Object.entries(opts.query).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))}` : "";
	return http(method, BASE + path + q, { headers: { Authorization: `Bearer ${env("ATTIO_API_KEY")}` }, json: opts.json, retries: opts.retries });
}

const query = async (obj: string, filter: unknown, limit = 10) =>
	(await attio("POST", `/objects/${obj}/records/query`, { json: { filter, limit } })).data as any[];
const first = (values: any, slug: string, key = "value") => values?.[slug]?.[0]?.[key] ?? null;
const iso = (d: Date) => d.toISOString().replace(/\.\d+Z$/, "Z");

export function readValue(items: any[] | undefined, type: string): unknown {
	const v = items?.[0];
	if (!v) return null;
	if (type === "select") return v.option?.title ?? null;
	if (type === "status") return v.status?.title ?? null;
	if (type === "currency") return v.currency_value ?? null;
	return v.value ?? null;
}

const specCache = new Map<string, { at: number; specs: Specs }>();

/** Writable single-value attributes of an object, with select/status options. Cached for 1 hour. */
export async function fieldSpecs(obj: "deals" | "companies"): Promise<Specs> {
	const hit = specCache.get(obj);
	if (hit && Date.now() - hit.at < 3_600_000) return hit.specs;
	const specs: Specs = {};
	for (const a of (await attio("GET", `/objects/${obj}/attributes`)).data) {
		if (a.is_archived || a.is_multiselect || !WRITABLE.has(a.type) || a.is_writable === false) continue;
		if (a.is_system_attribute && !(obj === "deals" && DEAL_SYSTEM_FIELDS.has(a.api_slug))) continue;
		const spec: Specs[string] = { title: a.title, type: a.type };
		if (a.type === "select" || a.type === "status") {
			const kind = a.type === "select" ? "options" : "statuses";
			spec.options = (await attio("GET", `/objects/${obj}/attributes/${a.api_slug}/${kind}`)).data.filter((o: any) => !o.is_archived).map((o: any) => o.title);
		}
		specs[a.api_slug] = spec;
	}
	specCache.set(obj, { at: Date.now(), specs });
	return specs;
}

export function currentFields(record: any, specs: Specs): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [slug, spec] of Object.entries(specs)) {
		const v = readValue(record.values?.[slug], spec.type);
		if (v !== null) out[slug] = v;
	}
	return out;
}

let ownerId: string | undefined;
export async function ownerMemberId(rules: Rules): Promise<string> {
	if (!ownerId) {
		const member = (await attio("GET", "/workspace_members")).data.find((m: any) => rules.owners.has(String(m.email_address).toLowerCase()));
		if (!member) throw new ApiError("no Attio workspace member matches OWNER_EMAILS");
		ownerId = member.id.workspace_member_id as string;
	}
	return ownerId;
}

// ---------- meetings and recordings ----------

export const getMeeting = async (id: string) => (await attio("GET", `/meetings/${id}`)).data;
export const getRecording = async (mid: string, rid: string) => (await attio("GET", `/meetings/${mid}/call_recordings/${rid}`)).data;

/** Meetings that ended in the last `days` days, newest first. Attio ignores `starts_from`; `ends_from` works. */
export async function* recentMeetings(days: number, extra: Record<string, string> = {}) {
	const q: Record<string, any> = { limit: 200, sort: "start_desc", ends_from: iso(new Date(Date.now() - days * 86_400_000)), starts_before: iso(new Date()), ...extra };
	while (true) {
		const page = await attio("GET", "/meetings", { query: q });
		yield* page.data;
		if (!page.pagination?.next_cursor) return;
		q.cursor = page.pagination.next_cursor;
	}
}

export async function listRecordings(mid: string): Promise<any[]> {
	return (await attio("GET", `/meetings/${mid}/call_recordings`, { query: { limit: 50 } })).data;
}

function pickCompany(companies: any[], people: Person[], rules: Rules) {
	const domains = (c: any) => new Set((c.values?.domains ?? []).map((d: any) => String(d.domain).toLowerCase()));
	const by = (role: string) => new Set(people.filter((p) => p.role === role).map((p) => p.email.split("@")[1]));
	for (const wanted of [by("external"), by("partner")]) {
		const hit = companies.find((c) => [...domains(c)].some((d) => wanted.has(d as string)));
		if (hit) return hit;
	}
	return companies.find((c) => ![...domains(c)].some((d) => rules.internal.has(d as string))) ?? null;
}

/** Everything a card needs: people and roles, routing, company, deals, last notes, writable fields. */
export async function buildContext(meeting: any, rules: Rules) {
	const people = participants(meeting, rules);
	const { sender, to, cc } = route(people, rules);
	let companies = await Promise.all((meeting.linked_records ?? []).filter((r: any) => r.object_slug === "companies").map(async (r: any) => (await attio("GET", `/objects/companies/records/${r.record_id}`)).data));
	if (!companies.length) {
		for (const domain of [...new Set(people.filter((p) => p.role === "external" || p.role === "partner").map((p) => p.email.split("@")[1]))].sort()) {
			companies.push(...(await query("companies", { domains: { domain: { $eq: domain } } }, 1)));
		}
	}
	const [dealSpecs, companySpecs] = await Promise.all([fieldSpecs("deals"), fieldSpecs("companies")]);
	const rec = pickCompany(companies, people, rules);
	let company = null;
	let deals: any[] = [];
	let notes: any[] = [];
	if (rec) {
		const cid = rec.id.record_id;
		company = { id: cid, name: first(rec.values, "name") ?? "", web_url: rec.web_url, fields: currentFields(rec, companySpecs) };
		deals = (await query("deals", { associated_company: { target_object: "companies", target_record_id: cid } }, 10)).slice(0, 5).map((d) => ({
			id: d.id.record_id, name: first(d.values, "name") ?? "", stage: readValue(d.values.stage, "status"), web_url: d.web_url, fields: currentFields(d, dealSpecs),
		}));
		notes = await listNotes("companies", cid, 3, 1500);
	}
	const peopleIds: Record<string, string> = {};
	for (const p of people.filter((x) => x.role === "external" || x.role === "partner")) {
		const hit = (await query("people", { email_addresses: p.email }, 1))[0];
		if (hit) {
			peopleIds[p.email] = hit.id.record_id;
			p.name = hit.values?.name?.[0]?.full_name ?? undefined;
		}
	}
	const start = meeting.start?.datetime ?? meeting.start?.date ?? "";
	return {
		meeting: { id: meeting.id.meeting_id, title: meeting.title || "Call", date: start.slice(0, 10) },
		participants: people, sender, default_to: to, default_cc: cc,
		company, deals, recent_notes: notes, people_ids: peopleIds,
		fields: { deal: dealSpecs, company: companySpecs },
	};
}

// ---------- reads for the agent ----------

export async function search(text: string, objects: string[]) {
	const res = await attio("POST", "/objects/records/search", { json: { query: text, objects, limit: 10, request_as: { type: "workspace" } } });
	return res.data.map((r: any) => ({ object: r.object_slug, record_id: r.id.record_id, name: r.record_text, domains: r.domains, emails: r.email_addresses }));
}

/** A record as title -> value, for single-value attributes that have a value. */
export async function getRecord(object: string, id: string) {
	const [rec, attrs] = await Promise.all([attio("GET", `/objects/${object}/records/${id}`), attio("GET", `/objects/${object}/attributes`)]);
	const values: Record<string, unknown> = {};
	for (const a of attrs.data) {
		const items = rec.data.values?.[a.api_slug];
		if (a.is_archived || !items?.length) continue;
		const v = items[0];
		values[a.title] = a.type === "record-reference" ? items.map((x: any) => `${x.target_object}:${x.target_record_id}`)
			: a.type === "personal-name" ? v.full_name
			: a.type === "domain" ? items.map((x: any) => x.domain)
			: a.type === "email-address" ? items.map((x: any) => x.email_address)
			: a.type === "actor-reference" ? v.referenced_actor_id
			: a.type === "location" ? [v.locality, v.country_code].filter(Boolean).join(", ")
			: readValue(items, a.type) ?? v.value ?? null;
	}
	return { object, record_id: id, web_url: rec.data.web_url, values };
}

export async function listDeals(stage: string | undefined, limit: number) {
	const deals = await query("deals", stage ? { stage } : {}, Math.min(limit, 100));
	const companyIds = [...new Set(deals.map((d) => first(d.values, "associated_company", "target_record_id")).filter(Boolean))];
	const names = new Map<string, string>();
	if (companyIds.length) {
		for (const c of await query("companies", { record_id: { $in: companyIds } }, 100)) names.set(c.id.record_id, first(c.values, "name"));
	}
	return deals.map((d) => ({
		record_id: d.id.record_id, name: first(d.values, "name"), stage: readValue(d.values.stage, "status"),
		value: readValue(d.values.value, "currency"), company: names.get(first(d.values, "associated_company", "target_record_id")) ?? null,
		created_at: String(first(d.values, "created_at") ?? "").slice(0, 10), web_url: d.web_url,
	}));
}

export async function listNotes(object: string, id: string, limit = 10, chars = 4000) {
	const notes = (await attio("GET", "/notes", { query: { parent_object: object, parent_record_id: id, limit: 50 } })).data;
	notes.sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
	return notes.slice(0, limit).map((n: any) => ({ title: n.title, created_at: String(n.created_at).slice(0, 10), text: String(n.content_plaintext ?? "").slice(0, chars) }));
}

/** Recorded meetings of the last `days` days, optionally only those linked to one company. */
export async function listCalls(days: number, rules: Rules, companyId?: string) {
	const extra = companyId ? { linked_object: "companies", linked_record_id: companyId } : {};
	const meetings: any[] = [];
	for await (const m of recentMeetings(days, extra)) {
		if (shouldProcess(m, rules)[0]) meetings.push(m);
		if (meetings.length >= 40) break;
	}
	const recordings = await Promise.all(meetings.map((m) => listRecordings(m.id.meeting_id)));
	return meetings.flatMap((m, i) => recordings[i].map((r) => ({
		meeting_id: m.id.meeting_id, recording_id: r.id.call_recording_id, title: m.title, date: String(m.start?.datetime ?? "").slice(0, 10),
		participants: participants(m, rules).filter((p) => p.role !== "owner").map((p) => p.email),
	})));
}

export async function personByEmail(email: string) {
	return (await query("people", { email_addresses: email }, 1))[0] ?? null;
}

// ---------- writes (only after a button tap) ----------

const actor = (id: string) => [{ referenced_actor_type: "workspace-member", referenced_actor_id: id }];
const toAttio = (type: string, value: unknown) => (type === "currency" ? [{ currency_value: value }] : value);

/** Write the CRM part of a card. Each finished step goes into `result` and is saved, so a retry does only the rest. */
export async function applyCard(ctx: any, plan: Plan, result: any, save: () => void, rules: Rules) {
	const owner = await ownerMemberId(rules);
	const values = (obj: "deal" | "company") => Object.fromEntries(plan.changes.filter((c) => c.object === obj)
		.map((c) => [c.attribute, toAttio(ctx.fields[obj][c.attribute].type, c.new)]));
	const company = ctx.company;
	let dealId = result.deal_id || plan.deal_id;
	const dealValues = values("deal");
	const companyValues = values("company");

	if (plan.deal_action === "create" && !dealId) {
		const fresh: any = { name: plan.new_deal_name, ...dealValues, owner: actor(owner) };
		if (company) fresh.associated_company = { target_object: "companies", target_record_id: company.id };
		const people = Object.values(ctx.people_ids ?? {});
		if (people.length) fresh.associated_people = people.map((p) => ({ target_object: "people", target_record_id: p }));
		const rec = (await attio("POST", "/objects/deals/records", { json: { data: { values: fresh } }, retries: 1 })).data;
		dealId = result.deal_id = rec.id.record_id;
		result.deal_url = rec.web_url;
		result.deal_fields = true;
		save();
	}
	if (Object.keys(dealValues).length && dealId && !result.deal_fields) {
		await attio("PATCH", `/objects/deals/records/${dealId}`, { json: { data: { values: dealValues } } });
		result.deal_fields = true;
		save();
	}
	if (Object.keys(companyValues).length && company && !result.company_fields) {
		await attio("PATCH", `/objects/companies/records/${company.id}`, { json: { data: { values: companyValues } } });
		result.company_fields = true;
		save();
	}
	const title = `Call: ${ctx.meeting.title} (${ctx.meeting.date})`;
	for (const [obj, id] of [["deals", dealId], ["companies", company?.id]] as const) {
		if (id && plan.note && !result[`note_${obj}`]) {
			const note = (await attio("POST", "/notes", { json: { data: { parent_object: obj, parent_record_id: id, title, format: "markdown", content: plan.note, meeting_id: ctx.meeting.id } }, retries: 1 })).data;
			result[`note_${obj}`] = note.id.note_id;
			save();
		}
	}
	const links = [...(dealId ? [{ target_object: "deals", target_record_id: dealId }] : []), ...(company ? [{ target_object: "companies", target_record_id: company.id }] : [])];
	result.tasks ??= [];
	for (const t of plan.tasks.slice(result.tasks.length)) {
		result.tasks.push(await createTask(t.content, t.due_date, links, owner));
		save();
	}
	result.crm = "applied";
	save();
	return result;
}

export async function createTask(content: string, due: string, links: any[], owner: string): Promise<string> {
	const task = (await attio("POST", "/tasks", { json: { data: {
		content, format: "plaintext", deadline_at: due ? `${due}T09:00:00.000Z` : null, is_completed: false,
		linked_records: links, assignees: actor(owner),
	} }, retries: 1 })).data;
	return task.id.task_id;
}

export async function createNote(object: string, id: string, title: string, content: string): Promise<string> {
	return (await attio("POST", "/notes", { json: { data: { parent_object: object, parent_record_id: id, title, format: "markdown", content } }, retries: 1 })).data.id.note_id;
}

export async function updateRecord(object: string, id: string, values: Record<string, unknown>) {
	return (await attio("PATCH", `/objects/${object}/records/${id}`, { json: { data: { values } } })).data;
}

export async function createDeal(values: Record<string, unknown>, rules: Rules) {
	return (await attio("POST", "/objects/deals/records", { json: { data: { values: { ...values, owner: actor(await ownerMemberId(rules)) } } }, retries: 1 })).data;
}

export { toAttio };
