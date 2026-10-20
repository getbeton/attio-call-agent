// Entry point: webhooks, Telegram routing, buttons, commands, the reconcile timer, and the CLI.
//
//   node src/main.ts serve                    # default
//   node src/main.ts setup <public_url>       # Telegram webhook + bot profile, Attio webhook (prints its secret once)
//   node src/main.ts gmail-auth               # one-time Gmail refresh token (gmail.send only)
//   DRY_RUN=1 node src/main.ts card <meeting_id> <recording_id>   # local test: print to stdout, no writes
//   DRY_RUN=1 node src/main.ts say "<text>"                       # local test: one message to the general chat
//   DRY_RUN=1 node src/main.ts reply <recording_id> "<text>"      # local test: one reply to a card
import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ask, CHAT_EFFORT, clearCardButtons, initAgent, newChat, sendCard, startCard } from "./agent.ts";
import * as attio from "./attio.ts";
import { sendEmail } from "./gmail.ts";
import { env, http } from "./net.ts";
import { cardStatus, crmOpen, emailOpen, type Rules, rulesFromEnv, shouldProcess } from "./plan.ts";
import { Store } from "./store.ts";
import * as tg from "./telegram.ts";

const COMMIT = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || "dev";
const DATA = process.env.DATA_DIR || "data";
let rules: Rules;
let store: Store;

async function boot() {
	rules = rulesFromEnv();
	mkdirSync(DATA, { recursive: true });
	store = new Store(join(DATA, "agent.db"));
	if (!store.meta("start_from")) store.setMeta("start_from", new Date().toISOString());
	await initAgent({ store, rules, dataDir: DATA });
}

const notify = (text: string) => tg.send(`⚠️ ${tg.esc(text.slice(0, 3000))}`).catch((e) => console.error("notify failed", e));

// ---------- buttons ----------

async function cardButton(act: string, rid: string, version: string, messageId?: number) {
	const row = store.card(rid);
	if (!(act in tg.CARD_ACTIONS) || !row || row.status !== "open" || String(row.version) !== version) {
		await tg.send("This button is old or the card is closed. /pending sends the open cards again.");
		return;
	}
	const part = tg.CARD_ACTIONS[act];
	const result = row.result ?? {};
	if (!(part === "crm" ? crmOpen(result) : emailOpen(result))) return void tg.send("This part is already done.");
	if (act === "es" && !row.plan.email.to.length) return void tg.send("No recipient. Reply with one.");
	const title = tg.esc(row.context.meeting.title);
	await tg.clearButtons(messageId);
	if (act === "cx" || act === "ex") {
		result[part] = "skipped";
		store.updateCard(rid, { result, status: cardStatus(result) });
		await tg.send(`⏭ ${title}: ${part === "crm" ? "CRM" : "email"} skipped.`);
		return;
	}
	const save = () => store.updateCard(rid, { result });
	store.updateCard(rid, { status: "working" });
	try {
		if (act === "ca") await attio.applyCard(row.context, row.plan, result, save, rules);
		else {
			if (result.email === "sending") throw new Error("the email state is unknown after an error. Check the Sent folder. I will not send it again. Tap Skip email to close this part.");
			result.email = "sending";
			save();
			result.email = await sendEmail(row.plan.email);
			save();
		}
	} catch (e) {
		store.updateCard(rid, { status: "open", error: String((e as Error).message).slice(0, 1000) });
		await tg.send(`⚠️ ${title}: ${tg.esc((e as Error).message.slice(0, 800))}\nTap again to finish the remaining steps.`, tg.cardButtons(rid, row.version, part, row.plan.email.to.length > 0));
		return;
	}
	store.updateCard(rid, { status: cardStatus(result), error: null });
	if (act === "es") return void tg.send(`✉️ <b>${title}</b> · sent to ${tg.esc(row.plan.email.to.join(", "))}`);
	const deal = result.deal_url ?? row.context.deals.find((d: any) => d.id === row.plan.deal_id)?.web_url;
	const lines = [`✅ <b>${title}</b> · Attio updated`];
	if (deal) lines.push(`• <a href="${tg.esc(deal)}">${result.deal_id ? `New deal: ${tg.esc(row.plan.new_deal_name)}` : "Deal"}</a>`);
	if (row.context.company?.web_url) lines.push(`• <a href="${tg.esc(row.context.company.web_url)}">${tg.esc(row.context.company.name)}</a>`);
	lines.push(`• ${row.plan.changes.length} field changes, ${Object.keys(result).filter((k) => k.startsWith("note_")).length} notes, ${(result.tasks ?? []).length} tasks`);
	await tg.send(lines.join("\n"));
}

async function actionButton(act: string, id: number, messageId?: number) {
	const a = store.action(id);
	if (!a || a.status !== "proposed") return void tg.send(`Proposal #${id} is already ${a?.status ?? "gone"}.`);
	await tg.clearButtons(messageId);
	if (act === "ax") {
		store.updateAction(id, { status: "skipped" });
		return void tg.send(`⏭ Proposal #${id} skipped.`);
	}
	const p = a.payload;
	store.updateAction(id, { status: "working" });
	try {
		let done = "";
		if (a.kind === "task") {
			await attio.createTask(p.content, p.due_date, p.links.map(({ target_object, target_record_id }: any) => ({ target_object, target_record_id })), await attio.ownerMemberId(rules));
			done = "task created";
		} else if (a.kind === "note") {
			await attio.createNote(p.object, p.record_id, p.title, p.content);
			done = `note added to ${tg.esc(p.label)}`;
		} else if (a.kind === "fields") {
			const rec = await attio.updateRecord(p.object, p.record_id, Object.fromEntries(p.changes.map((c: any) => [c.attribute, attio.toAttio(c.type, c.new)])));
			const what = p.changes.map((c: any) => `${tg.esc(c.title)} ${tg.esc(c.old ?? "—")} → ${tg.esc(c.new)}`).join(", ");
			done = `<a href="${tg.esc(rec.web_url)}">${tg.esc(p.label)}</a>: ${what}`;
		} else if (a.kind === "deal") {
			const rec = await attio.createDeal({
				name: p.name, stage: p.stage, ...(p.value !== null ? { value: [{ currency_value: p.value }] } : {}),
				...(p.company_id ? { associated_company: { target_object: "companies", target_record_id: p.company_id } } : {}),
			}, rules);
			done = `<a href="${tg.esc(rec.web_url)}">deal created</a>`;
		} else {
			store.updateAction(id, { result: { email: "sending" } });
			try {
				await sendEmail(p);
			} catch (e) {
				store.updateAction(id, { status: "failed", error: (e as Error).message });
				return void notify(`Proposal #${id}: the email may not have gone out (${(e as Error).message}). Check the Sent folder.`);
			}
			done = `email sent to ${tg.esc(p.to.join(", "))}`;
		}
		store.updateAction(id, { status: "applied" });
		await tg.send(`✅ #${id}: ${done}`);
	} catch (e) {
		store.updateAction(id, { status: "proposed", error: (e as Error).message });
		await tg.send(`⚠️ #${id}: ${tg.esc((e as Error).message.slice(0, 800))}`, tg.actionButtons(id));
	}
}

// ---------- messages and commands ----------

const HELP = `I turn recorded Attio calls into cards, and I answer questions about your CRM.

Cards
• After each recorded call you get a CRM part (✅ Apply to Attio / ⏭ Skip CRM) and an email part (✉️ Send / ⏭ Skip email).
• Reply to a card with text or voice: ask about the call, change the draft, ask for other tasks.

Chat
• A message that is not a reply goes to the general chat. Examples: "deals in Qualified", "what did we agree with Northwind?", "make a card for my call with Dana".
• Every write comes as a proposal with ✅ Apply / ⏭ Skip. Nothing is written or sent without your tap.

/pending sends the open cards again
/calls lists the cards of the last 7 days
/cost shows the xAI spend
/new starts a new chat (the old one is saved)`;

async function command(text: string) {
	const cmd = text.split(/[\s@]/)[0];
	if (cmd === "/pending") {
		const rows = store.openCards();
		if (!rows.length) return void tg.send("No open cards.");
		for (const row of rows) {
			await clearCardButtons(row);
			await sendCard(row.recording_id);
		}
	} else if (cmd === "/calls") {
		const rows = store.recentCards(new Date(Date.now() - 7 * 86_400_000).toISOString());
		await tg.send(rows.length ? rows.map((r: any) => `• ${tg.esc(r.context?.meeting?.date ?? "")} · ${tg.esc(r.context?.meeting?.title ?? r.meeting_id)} · ${r.status}`).join("\n") : "No cards in the last 7 days.");
	} else if (cmd === "/cost") {
		const day = 86_400_000;
		const lines = [["24 h", 1], ["7 days", 7], ["30 days", 30]].map(([label, days]) => {
			const c = store.costSince(new Date(Date.now() - (days as number) * day).toISOString());
			return `• ${label}: $${c.cost.toFixed(2)} · ${c.calls} model calls · ${c.cards} cards`;
		});
		await tg.send(`<b>xAI spend</b>\n${lines.join("\n")}`);
	} else if (cmd === "/new") {
		newChat();
		await tg.send("New chat started. The earlier chat is saved.");
	} else await tg.send(tg.esc(HELP));
}

async function transcribe(audio: Buffer, name: string): Promise<string> {
	const form = new FormData();
	form.append("model", process.env.XAI_STT_MODEL || "grok-voice-transcribe-2.0");
	form.append("file", new Blob([new Uint8Array(audio)]), name);
	const res = await http("POST", "https://api.x.ai/v1/stt", { headers: { Authorization: `Bearer ${env("XAI_API_KEY")}` }, body: form, timeoutMs: 180_000, retries: 2 });
	return String(res.text ?? "").trim();
}

async function onUpdate(update: any) {
	const owner = Number(env("TELEGRAM_OWNER_ID"));
	const cq = update.callback_query;
	if (cq) {
		if (cq.from?.id !== owner) return;
		const [act, a, b] = String(cq.data ?? "").split(":");
		if (act === "aa" || act === "ax") return actionButton(act, Number(a), cq.message?.message_id);
		return cardButton(act, a, b, cq.message?.message_id);
	}
	const msg = update.message;
	if (!msg || msg.from?.id !== owner || msg.chat?.id !== owner) return;
	let text = String(msg.text ?? msg.caption ?? "").trim();
	if (text.startsWith("/")) return command(text);
	const replyTo = msg.reply_to_message?.message_id;
	const key = (replyTo && store.sessionFor(replyTo)) || "chat";
	const audio = msg.voice ?? msg.audio;
	if (audio) {
		text = await transcribe(await tg.download(audio.file_id), audio.file_name ?? "voice.ogg");
		store.addMessages(key, [await tg.send(`🎙 <i>${tg.esc(text)}</i>`)]);
	}
	if (text) await ask(key, text, CHAT_EFFORT());
}

// ---------- recordings ----------

async function reconcile() {
	const since = store.meta("start_from") ?? "";
	for await (const m of attio.recentMeetings(Number(process.env.LOOKBACK_DAYS || 3))) {
		if (!shouldProcess(m, rules)[0]) continue;
		for (const r of await attio.listRecordings(m.id.meeting_id)) {
			if (store.card(r.id.call_recording_id) || String(r.created_at) < since) continue;
			await startCard(m.id.meeting_id, r.id.call_recording_id).catch((e) => notify(`Recording ${r.id.call_recording_id}: ${e.message}`));
		}
	}
}

/** One time: close the open cards of the Python version (calls.db) and remove their buttons. */
async function closeV1Cards() {
	const old = join(DATA, "calls.db");
	if (!existsSync(old)) return;
	const db = new DatabaseSync(old);
	const rows = db.prepare("select * from calls where status = 'drafted'").all() as any[];
	db.close();
	for (const r of rows) {
		await tg.clearButtons(r.card_message_id);
		await tg.clearButtons(r.crm_message_id);
	}
	renameSync(old, join(DATA, "calls.v1.db"));
	if (rows.length) await tg.send(`Switched to the Pi agent. Closed ${rows.length} open cards from the old version. New calls get new cards.`);
}

/** After a restart, nothing is running. Cards and proposals that were in progress are reopened or reported. */
function recoverAfterRestart() {
	for (const row of store.db.prepare("select recording_id from cards where status in ('drafting', 'working')").all() as any[]) {
		const card = store.card(row.recording_id);
		if (card.status === "working") store.updateCard(card.recording_id, { status: "open" });
		else {
			store.updateCard(card.recording_id, { status: "failed", error: "restart during the draft" });
			notify(`A restart stopped the draft for ${card.context?.meeting?.title ?? card.meeting_id}. Reply "make the card" to its message, or wait for the next check.`);
		}
	}
	store.db.prepare("update actions set status = 'proposed' where status = 'working' and kind != 'email'").run();
	store.db.prepare("update actions set status = 'failed', error = 'restart during send' where status = 'working' and kind = 'email'").run();
}

// ---------- server ----------

function verifyAttio(raw: Buffer, signature: string, secret: string): boolean {
	const expected = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
	const given = Buffer.from(signature.trim());
	return expected.length === given.length && timingSafeEqual(expected, given);
}

async function serve() {
	for (const name of ["ATTIO_API_KEY", "ATTIO_WEBHOOK_SECRET", "XAI_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_OWNER_ID", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"]) env(name);
	await boot();
	recoverAfterRestart();
	await closeV1Cards().catch((e) => notify(`closing old cards: ${e.message}`));
	const owner = Number(env("TELEGRAM_OWNER_ID"));
	const run = (job: Promise<unknown>, what: string) => job.catch((e) => notify(`${what}: ${e.message}`));

	createServer((req, res) => {
		const reply = (code: number, body = "ok") => res.writeHead(code, { "Content-Type": body.startsWith("{") ? "application/json" : "text/plain" }).end(body);
		if (req.method === "GET" && req.url === "/health") return reply(200, JSON.stringify({ ok: true, commit: COMMIT }));
		if (req.method !== "POST") return reply(404, "not found");
		const chunks: Buffer[] = [];
		let size = 0;
		req.on("data", (c) => {
			size += c.length;
			if (size > 1_000_000) req.destroy();
			else chunks.push(c);
		});
		req.on("end", () => {
			const raw = Buffer.concat(chunks);
			try {
				if (req.url === "/attio") {
					if (!verifyAttio(raw, String(req.headers["attio-signature"] ?? ""), env("ATTIO_WEBHOOK_SECRET"))) return reply(401, "bad signature");
					for (const ev of JSON.parse(raw.toString()).events ?? []) {
						if (ev.event_type === "call-recording.created") run(startCard(ev.id.meeting_id, ev.id.call_recording_id), "recording");
					}
					return reply(200);
				}
				if (req.url === "/telegram") {
					const token = Buffer.from(String(req.headers["x-telegram-bot-api-secret-token"] ?? ""));
					const secret = Buffer.from(env("TELEGRAM_WEBHOOK_SECRET"));
					if (token.length !== secret.length || !timingSafeEqual(token, secret)) return reply(401, "bad token");
					const update = JSON.parse(raw.toString());
					const cq = update.callback_query;
					if (cq?.from?.id === owner) tg.tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Working…" }).catch(() => {});
					run(onUpdate(update), "telegram");
					return reply(200);
				}
				reply(404, "not found");
			} catch {
				reply(400, "bad request");
			}
		});
	}).listen(Number(process.env.PORT || 8080), () => console.log(`listening on :${process.env.PORT || 8080}, commit ${COMMIT}`));

	const every = Number(process.env.RECONCILE_HOURS || 6) * 3_600_000;
	const tick = () => run(reconcile(), "reconcile").finally(() => setTimeout(tick, every));
	tick();
}

// ---------- one-time setup ----------

async function setup(publicUrl: string) {
	const base = publicUrl.replace(/\/$/, "");
	await tg.tg("setWebhook", { url: `${base}/telegram`, secret_token: env("TELEGRAM_WEBHOOK_SECRET"), allowed_updates: ["message", "callback_query"] });
	await tg.tg("setMyName", { name: process.env.BOT_NAME || "Call Agent" });
	await tg.tg("setMyDescription", { description: "Turns recorded Attio calls into CRM updates, next steps and a recap email, and answers questions about your CRM. You approve every write and every email. Private bot." });
	await tg.tg("setMyShortDescription", { short_description: "Attio call recaps and a CRM chat, with your approval." });
	await tg.tg("setMyCommands", { commands: [
		{ command: "pending", description: "Send the open cards again" }, { command: "calls", description: "Cards of the last 7 days" },
		{ command: "cost", description: "xAI spend" }, { command: "new", description: "Start a new chat" }, { command: "help", description: "How to use the bot" },
	] });
	const target = `${base}/attio`;
	const hooks = (await attio.attio("GET", "/webhooks")).data;
	if (hooks.some((h: any) => h.target_url === target)) return console.log(JSON.stringify({ attio_webhook: "exists", target_url: target }));
	const hook = (await attio.attio("POST", "/webhooks", { json: { data: { target_url: target, subscriptions: [{ event_type: "call-recording.created", filter: null }] } }, retries: 1 })).data;
	console.log(JSON.stringify({ attio_webhook_id: hook.id.webhook_id, attio_webhook_secret: hook.secret }));
}

async function gmailAuth() {
	const port = Number(process.env.OAUTH_PORT || 8765);
	const redirect = `http://localhost:${port}`;
	const state = crypto.randomUUID();
	console.error(`Open this URL and allow access:\nhttps://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
		client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: redirect, response_type: "code", state,
		scope: "https://www.googleapis.com/auth/gmail.send", access_type: "offline", prompt: "consent",
	})}`);
	const code = await new Promise<string>((resolve) => {
		const server = createServer((req, res) => {
			const q = new URL(req.url ?? "/", redirect).searchParams;
			if (q.get("state") === state && q.get("code")) {
				res.end("Done. You can close this tab.");
				server.close();
				resolve(q.get("code") as string);
			} else res.end("No code in this request.");
		}).listen(port, "localhost");
	});
	const body = new URLSearchParams({ code, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri: redirect, grant_type: "authorization_code" });
	const res = await http("POST", "https://oauth2.googleapis.com/token", { body, headers: { "Content-Type": "application/x-www-form-urlencoded" }, retries: 1 });
	console.log(JSON.stringify({ refresh_token: res.refresh_token, scope: res.scope }));
}

// ---------- CLI ----------

const [cmd = "serve", ...args] = process.argv.slice(2);
if (cmd === "serve") await serve();
else if (cmd === "setup" && args[0]) await setup(args[0]);
else if (cmd === "gmail-auth") await gmailAuth();
else if (cmd === "card" && args.length === 2) {
	await boot();
	console.log(await startCard(args[0], args[1]));
	process.exit(0);
} else if (cmd === "say" && args[0]) {
	await boot();
	if (args[0].startsWith("/")) await command(args[0]);
	else await ask("chat", args[0], CHAT_EFFORT());
	process.exit(0);
} else if (cmd === "reply" && args.length === 2) {
	await boot();
	await ask(`card:${args[0]}`, args[1], CHAT_EFFORT());
	process.exit(0);
} else {
	console.error("usage: node src/main.ts [serve | setup <url> | gmail-auth | card <meeting_id> <recording_id> | say <text> | reply <recording_id> <text>]");
	process.exit(1);
}
