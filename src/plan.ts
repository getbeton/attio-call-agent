// Pure logic: who is who in a meeting, the transcript format, and the validation of model output.
// No network here. tests/plan.test.ts covers this file.
import { envList } from "./net.ts";

export type Role = "owner" | "internal" | "partner" | "external";
export type Person = { email: string; role: Role; name?: string };
export type Rules = { owners: Set<string>; internal: Set<string>; partners: Record<string, string>; defaultSender: string };
export type FieldSpec = { title: string; type: string; options?: string[] };
export type Specs = Record<string, FieldSpec>;

export function rulesFromEnv(): Rules {
	const owners = envList("OWNER_EMAILS");
	if (!owners.length) throw new Error("missing env var OWNER_EMAILS");
	const partners: Record<string, string> = {};
	for (const pair of (process.env.PARTNERS ?? "").split(",")) {
		const [domain, sender] = pair.split("=").map((x) => x?.trim());
		if (domain && sender) partners[domain.toLowerCase()] = sender;
	}
	const internal = new Set([...envList("INTERNAL_DOMAINS"), ...owners.map((e) => e.split("@")[1])]);
	return { owners: new Set(owners), internal, partners, defaultSender: process.env.DEFAULT_SENDER || owners.sort()[0] };
}

const domainOf = (email: string) => email.split("@").pop() ?? "";

export function roleOf(email: string, rules: Rules): Role {
	if (rules.owners.has(email)) return "owner";
	if (rules.internal.has(domainOf(email))) return "internal";
	if (domainOf(email) in rules.partners) return "partner";
	return "external";
}

export function participants(meeting: any, rules: Rules): Person[] {
	const seen = new Set<string>();
	const out: Person[] = [];
	for (const p of meeting.participants ?? []) {
		const email = String(p.email_address ?? "").trim().toLowerCase();
		if (email && !seen.has(email)) {
			seen.add(email);
			out.push({ email, role: roleOf(email, rules) });
		}
	}
	return out;
}

export function shouldProcess(meeting: any, rules: Rules): [boolean, string] {
	const roles = new Set(participants(meeting, rules).map((p) => p.role));
	if (!roles.has("owner")) return [false, "owner is not a participant"];
	if (!roles.has("external") && !roles.has("partner")) return [false, "internal meeting"];
	return [true, ""];
}

/** Sender, To and CC. Prospects get the email; a partner gets it only when no prospect was on the call. */
export function route(people: Person[], rules: Rules): { sender: string; to: string[]; cc: string[] } {
	const of = (role: Role) => people.filter((p) => p.role === role).map((p) => p.email);
	const [ext, par, internal] = [of("external"), of("partner"), of("internal")];
	const sender = par.length ? rules.partners[domainOf(par[0])] : rules.defaultSender;
	const to = ext.length ? ext : par;
	const cc = [...internal, ...(ext.length ? par : [])].filter((e) => e !== sender.toLowerCase());
	return { sender, to, cc };
}

/** The From address for an email outside a card: a partner's sender if any recipient is at that partner. */
export function senderFor(recipients: string[], rules: Rules): string {
	const partner = recipients.map(domainOf).find((d) => d in rules.partners);
	return partner ? rules.partners[partner] : rules.defaultSender;
}

/** Merge consecutive segments of one speaker into one "[mm:ss] Name: text" line. */
export function formatTranscript(segments: any[]): string {
	const lines: string[] = [];
	let speaker: string | null = null;
	let words: string[] = [];
	let start = 0;
	const stamp = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
	for (const s of segments) {
		const name = s.speaker?.name || "Unknown";
		if (name !== speaker && words.length) {
			lines.push(`[${stamp(start)}] ${speaker}: ${words.join(" ")}`);
			words = [];
		}
		if (!words.length) {
			speaker = name;
			start = Number(s.start_time ?? 0);
		}
		words.push(String(s.speech ?? "").trim());
	}
	if (words.length) lines.push(`[${stamp(start)}] ${speaker}: ${words.join(" ")}`);
	return lines.join("\n");
}

export function coerce(spec: FieldSpec, value: unknown): string | number | boolean {
	const text = String(value ?? "").trim();
	if (!text) throw new Error("empty value");
	switch (spec.type) {
		case "text":
			return text.slice(0, 2000);
		case "number":
		case "currency": {
			const n = Number(text.replace(/[\s,$€£]/g, ""));
			if (!Number.isFinite(n)) throw new Error(`not a number: ${text}`);
			return n;
		}
		case "checkbox":
			if (["true", "yes", "1"].includes(text.toLowerCase())) return true;
			if (["false", "no", "0"].includes(text.toLowerCase())) return false;
			throw new Error(`not a checkbox value: ${text}`);
		case "date":
			if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) throw new Error(`not a date: ${text}`);
			return text;
		case "select":
		case "status": {
			const option = (spec.options ?? []).find((o) => o.toLowerCase() === text.toLowerCase());
			if (!option) throw new Error(`unknown option "${text}"`);
			return option;
		}
		default:
			throw new Error(`type ${spec.type} is not writable`);
	}
}

export function same(a: unknown, b: unknown): boolean {
	if (typeof a === "number" && typeof b === "number") return a === b;
	return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export const cleanText = (text: unknown) => String(text ?? "").replaceAll("—", "-").trim();
export const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
export const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

export type Change = { object: "deal" | "company"; attribute: string; title: string; old: unknown; new: unknown; evidence: string };
export type Plan = {
	language: string;
	summary: string;
	deal_action: "update" | "create" | "none";
	deal_id: string;
	new_deal_name: string;
	changes: Change[];
	tasks: { content: string; due_date: string }[];
	note: string;
	questions: string[];
	email: { sender: string; to: string[]; cc: string[]; subject: string; body: string };
	warnings: string[];
};

/** Validate a draft card against the CRM schema and the meeting. Drop what does not fit and say why. */
export function makePlan(draft: any, ctx: any, feedback: string[]): Plan {
	const warnings: string[] = [];
	const deals = new Map<string, any>(ctx.deals.map((d: any) => [d.id, d]));
	let action = draft.deal_action;
	const dealId = String(draft.deal_id ?? "").trim();
	const name = String(draft.new_deal_name ?? "").trim();
	if (action === "update" && !deals.has(dealId)) {
		warnings.push("Deal update dropped: unknown deal id.");
		action = "none";
	}
	if (action === "create" && !name) {
		warnings.push("New deal dropped: no name.");
		action = "none";
	}
	if (action !== "update" && action !== "create") action = "none";

	const changes: Change[] = [];
	for (const ch of draft.changes ?? []) {
		const spec: FieldSpec | undefined = ctx.fields[ch.object]?.[ch.attribute];
		if (!spec || (ch.object === "deal" && action === "none") || (ch.object === "company" && !ctx.company)) {
			warnings.push(`Dropped change ${ch.object}.${ch.attribute}.`);
			continue;
		}
		let value: unknown;
		try {
			value = coerce(spec, ch.value);
		} catch (e) {
			warnings.push(`Dropped ${ch.object}.${ch.attribute}: ${(e as Error).message}`);
			continue;
		}
		const current = ch.object === "deal" ? (action === "update" ? deals.get(dealId).fields : {}) : ctx.company.fields;
		const old = current[ch.attribute] ?? null;
		if (old !== null && same(old, value)) continue;
		changes.push({ object: ch.object, attribute: ch.attribute, title: spec.title, old, new: value, evidence: String(ch.evidence ?? "").trim().slice(0, 300) });
	}
	if (action === "create" && !changes.some((c) => c.object === "deal" && c.attribute === "stage")) {
		warnings.push("The new deal has no stage. Reply with a stage.");
	}

	const tasks = (draft.tasks ?? [])
		.map((t: any) => ({ content: String(t.content ?? "").trim().slice(0, 2000), due_date: isDate(String(t.due_date ?? "")) ? t.due_date : "" }))
		.filter((t: any) => t.content)
		.slice(0, 8);

	const allowed = new Set([...ctx.participants.map((p: Person) => p.email), ...feedback.flatMap((f) => (f.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))]);
	const to: string[] = [];
	const cc: string[] = [];
	const dropped: string[] = [];
	for (const [source, target] of [[draft.email_to, to], [draft.email_cc, cc]] as const) {
		for (const raw of source ?? []) {
			const e = String(raw).trim().toLowerCase();
			if (!allowed.has(e)) dropped.push(e);
			else if (!to.includes(e) && !cc.includes(e) && e !== ctx.sender.toLowerCase()) target.push(e);
		}
	}
	if (dropped.length) warnings.push(`Dropped recipients that are not in the meeting or your messages: ${dropped.join(", ")}`);
	if (!to.length) warnings.push("No recipient. Send is off.");

	return {
		language: draft.language || "en",
		summary: String(draft.summary ?? "").trim(),
		deal_action: action,
		deal_id: action === "update" ? dealId : "",
		new_deal_name: action === "create" ? name : "",
		changes,
		tasks,
		note: String(draft.note ?? "").trim(),
		questions: (draft.questions ?? []).map((q: string) => String(q).trim()).filter(Boolean).slice(0, 5),
		email: { sender: ctx.sender, to, cc, subject: cleanText(draft.email_subject), body: cleanText(draft.email_body) },
		warnings,
	};
}

// A card has two parts. Each part is decided once: applied/skipped (CRM), sent/skipped (email).
export const crmOpen = (result: any) => !["applied", "skipped"].includes(result?.crm);
export const emailOpen = (result: any) => !result?.email || result.email === "sending";
export function cardStatus(result: any): "open" | "done" | "skipped" {
	if (crmOpen(result) || emailOpen(result)) return "open";
	return result.crm === "skipped" && result.email === "skipped" ? "skipped" : "done";
}
