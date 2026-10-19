// Telegram: API calls, the card and action messages, and the split into messages under the size limit.
import { ApiError, DRY_RUN, env, http } from "./net.ts";
import type { Plan } from "./plan.ts";

const LIMIT = 4000;
let dryId = 1000;

export async function tg(method: string, params: Record<string, unknown>): Promise<any> {
	if (DRY_RUN) {
		if (method === "sendMessage" || method === "editMessageText") console.log(`\n--- telegram ${method} ---\n${String(params.text).replace(/<[^>]+>/g, "")}\n${params.reply_markup ? JSON.stringify(params.reply_markup) : ""}`);
		return { message_id: ++dryId };
	}
	const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null));
	return (await http("POST", `https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/${method}`, { json: clean })).result;
}

const owner = () => Number(env("TELEGRAM_OWNER_ID"));
const strip = (html: string) => html.replace(/<[^>]+>/g, "").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
export const esc = (s: unknown) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Send one HTML message to the owner. If Telegram cannot parse the HTML, send it as plain text. */
export async function send(html: string, markup?: unknown): Promise<number> {
	try {
		return (await tg("sendMessage", { chat_id: owner(), text: html, parse_mode: "HTML", reply_markup: markup, link_preview_options: { is_disabled: true } })).message_id;
	} catch (e) {
		if (!String((e as Error).message).toLowerCase().includes("parse")) throw e;
		return (await tg("sendMessage", { chat_id: owner(), text: strip(html), reply_markup: markup })).message_id;
	}
}

export async function edit(messageId: number, html: string): Promise<void> {
	try {
		await tg("editMessageText", { chat_id: owner(), message_id: messageId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } });
	} catch {
		// the text did not change, or the message is too old
	}
}

export async function remove(messageId: number): Promise<void> {
	try {
		await tg("deleteMessage", { chat_id: owner(), message_id: messageId });
	} catch {}
}

export async function clearButtons(messageId: number | null | undefined): Promise<void> {
	if (!messageId) return;
	try {
		await tg("editMessageReplyMarkup", { chat_id: owner(), message_id: messageId, reply_markup: { inline_keyboard: [] } });
	} catch {}
}

export const typing = () => tg("sendChatAction", { chat_id: owner(), action: "typing" }).catch(() => {});

export async function download(fileId: string): Promise<Buffer> {
	const { file_path } = await tg("getFile", { file_id: fileId });
	return http("GET", `https://api.telegram.org/file/bot${env("TELEGRAM_BOT_TOKEN")}/${file_path}`, { raw: true });
}

/** Join blocks into messages under the limit. A block over the limit is cut at line ends, then at spaces. */
export function pack(blocks: string[], limit = LIMIT): string[] {
	const pieces: string[] = [];
	for (const block of blocks) {
		if (block.length <= limit) {
			pieces.push(block);
			continue;
		}
		let cur = "";
		for (let line of block.split("\n")) {
			while (line.length > limit) {
				const space = line.lastIndexOf(" ", limit);
				const cut = space > 0 ? space : limit;
				pieces.push(line.slice(0, cut));
				line = line.slice(cut).trimStart();
			}
			if (cur && cur.length + 1 + line.length > limit) {
				pieces.push(cur);
				cur = line;
			} else cur = cur ? `${cur}\n${line}` : line;
		}
		if (cur) pieces.push(cur);
	}
	const messages: string[] = [];
	let cur = "";
	for (const p of pieces) {
		if (cur && cur.length + 2 + p.length > limit) {
			messages.push(cur);
			cur = p;
		} else cur = cur ? `${cur}\n\n${p}` : p;
	}
	if (cur) messages.push(cur);
	return messages;
}

/** The agent writes plain text, sometimes with **bold** or `code`. Escape it and keep those two marks. */
export function agentHtml(text: string): string {
	return esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`\n]+)`/g, "<code>$1</code>");
}

// ---------- the card ----------

export const CARD_ACTIONS: Record<string, "crm" | "email"> = { ca: "crm", cx: "crm", es: "email", ex: "email" };

export function cardButtons(rid: string, version: number, part: "crm" | "email", canSend = true) {
	const row = part === "crm"
		? [{ text: "✅ Apply to Attio", callback_data: `ca:${rid}:${version}` }, { text: "⏭ Skip CRM", callback_data: `cx:${rid}:${version}` }]
		: [...(canSend ? [{ text: "✉️ Send", callback_data: `es:${rid}:${version}` }] : []), { text: "⏭ Skip email", callback_data: `ex:${rid}:${version}` }];
	return { inline_keyboard: [row] };
}

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "boolean" ? (v ? "yes" : "no") : typeof v === "number" ? v.toLocaleString("en-US") : String(v));

/** Two lists of HTML blocks: the CRM part and the email part. Each block is self-contained HTML. */
export function renderCard(ctx: any, plan: Plan, version: number): { crm: string[]; email: string[] } {
	const m = ctx.meeting;
	const head = [`📞 <b>${esc(m.title)}</b> · ${esc(m.date)} · v${version}`];
	const deal = ctx.deals.find((d: any) => d.id === plan.deal_id);
	const where: string[] = [];
	if (ctx.company) where.push(`🏢 ${esc(ctx.company.name)}`);
	if (deal) where.push(`Deal: ${esc(deal.name)} (${esc(deal.stage ?? "—")})`);
	else if (plan.deal_action === "create") where.push(`New deal: <b>${esc(plan.new_deal_name)}</b>`);
	if (where.length) head.push(where.join(" · "));
	if (plan.summary) head.push("", esc(plan.summary));

	const crm = ["<b>CRM</b>"];
	for (const c of plan.changes) {
		crm.push(`• ${c.object === "deal" ? "Deal" : "Company"} · ${esc(c.title)}: ${esc(show(c.old))} → <b>${esc(show(c.new))}</b>`);
		if (c.evidence) crm.push(`   <i>«${esc(c.evidence)}»</i>`);
	}
	if (!plan.changes.length) crm.push("• no field changes");
	const tasks = ["<b>Next steps → Attio tasks</b>", ...(plan.tasks.length ? plan.tasks.map((t) => `• ${esc(t.due_date || "no date")} · ${esc(t.content)}`) : ["• none"])];

	const blocks = [head.join("\n"), crm.join("\n"), tasks.join("\n")];
	if (plan.note) blocks.push(`<b>Minutes note → Attio</b>\n<blockquote expandable>${esc(plan.note.length > 1500 ? `${plan.note.slice(0, 1500)}…` : plan.note)}</blockquote>`);
	if (plan.questions.length) blocks.push(`<b>Check</b>\n${plan.questions.map((q) => `• ${esc(q)}`).join("\n")}`);
	if (plan.warnings.length) blocks.push(plan.warnings.map((w) => `⚠️ ${esc(w)}`).join("\n"));

	const em = plan.email;
	const mailHead = [`✉️ <b>Email</b> · ${esc(m.title)} · v${version}`, `From: ${esc(em.sender)}`, `To: ${esc(em.to.join(", ") || "—")}`];
	if (em.cc.length) mailHead.push(`CC: ${esc(em.cc.join(", "))}`);
	mailHead.push(`Subject: <b>${esc(em.subject)}</b>`);
	return { crm: blocks, email: [mailHead.join("\n"), esc(em.body)] };
}

export const actionButtons = (id: number) => ({ inline_keyboard: [[{ text: "✅ Apply", callback_data: `aa:${id}` }, { text: "⏭ Skip", callback_data: `ax:${id}` }]] });

export { ApiError };
