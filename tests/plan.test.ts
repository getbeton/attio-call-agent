import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { cardStatus, coerce, formatTranscript, makePlan, participants, type Rules, route, senderFor, shouldProcess } from "../src/plan.ts";
import { Store } from "../src/store.ts";
import { actionButtons, agentHtml, cardButtons, pack, renderCard } from "../src/telegram.ts";
import { redact } from "../src/net.ts";

const RULES: Rules = {
	owners: new Set(["me@acme.io"]),
	internal: new Set(["acme.io", "acme-data.com"]),
	partners: { "partner.org": "me@partner-desk.io" },
	defaultSender: "me@acme-data.com",
};
const meeting = (...emails: string[]) => ({ participants: emails.map((email_address) => ({ email_address })) });
const people = (...emails: string[]) => participants(meeting(...emails), RULES);

test("routing: prospect call", () => {
	assert.deepEqual(route(people("me@acme.io", "bob@client.com", "ann@acme.io"), RULES), { sender: "me@acme-data.com", to: ["bob@client.com"], cc: ["ann@acme.io"] });
});

test("routing: partner only, and partner with prospect", () => {
	assert.deepEqual(route(people("me@acme.io", "eve@partner.org"), RULES), { sender: "me@partner-desk.io", to: ["eve@partner.org"], cc: [] });
	assert.deepEqual(route(people("me@acme.io", "eve@partner.org", "bob@client.com"), RULES), { sender: "me@partner-desk.io", to: ["bob@client.com"], cc: ["eve@partner.org"] });
	assert.equal(senderFor(["x@partner.org"], RULES), "me@partner-desk.io");
	assert.equal(senderFor(["x@other.com"], RULES), "me@acme-data.com");
});

test("which meetings get a card", () => {
	assert.equal(shouldProcess(meeting("me@acme.io", "bob@client.com"), RULES)[0], true);
	assert.equal(shouldProcess(meeting("me@acme.io", "ann@acme.io"), RULES)[0], false);
	assert.equal(shouldProcess(meeting("ann@acme.io", "bob@client.com"), RULES)[0], false);
});

const CTX = {
	meeting: { id: "m1", title: "Acme <> Client", date: "2026-10-12" },
	participants: people("me@acme.io", "bob@client.com", "ann@acme.io"),
	sender: "me@acme-data.com",
	company: { id: "c1", name: "Client", fields: { crm: "HubSpot" } },
	deals: [{ id: "d1", name: "Client pilot", stage: "Demo done", fields: { stage: "Demo done", value: 5000 } }],
	people_ids: {},
	fields: {
		deal: { stage: { title: "Deal stage", type: "status", options: ["Demo done", "Pricing discussion"] }, value: { title: "Deal value", type: "currency" } },
		company: { crm: { title: "CRM", type: "select", options: ["HubSpot", "Salesforce"] } },
	},
};
const draft = (over: any = {}) => ({
	language: "en", summary: "s", deal_action: "update", deal_id: "d1", new_deal_name: "", changes: [], tasks: [], note: "n",
	email_to: ["bob@client.com"], email_cc: ["ann@acme.io"], email_subject: "Notes", email_body: "Hi Bob — notes.", questions: [], ...over,
});

test("plan: valid changes, no-op dropped", () => {
	const plan = makePlan(draft({ changes: [
		{ object: "deal", attribute: "stage", value: "pricing discussion", evidence: "q" },
		{ object: "deal", attribute: "value", value: "$12,000", evidence: "q" },
		{ object: "company", attribute: "crm", value: "hubspot", evidence: "q" },
	] }), CTX, []);
	assert.deepEqual(plan.changes.map((c) => [c.attribute, c.old, c.new]), [["stage", "Demo done", "Pricing discussion"], ["value", 5000, 12000]]);
});

test("plan: bad changes and unknown deal dropped with warnings", () => {
	const bad = makePlan(draft({ changes: [{ object: "deal", attribute: "stage", value: "Won big", evidence: "" }, { object: "deal", attribute: "owner", value: "x", evidence: "" }] }), CTX, []);
	assert.equal(bad.changes.length, 0);
	assert.equal(bad.warnings.length, 2);
	const unknown = makePlan(draft({ deal_id: "nope", changes: [{ object: "deal", attribute: "value", value: "1", evidence: "" }] }), CTX, []);
	assert.equal(unknown.deal_action, "none");
	assert.equal(unknown.changes.length, 0);
});

test("plan: recipients only from the meeting and the owner's messages", () => {
	const plan = makePlan(draft({ email_to: ["bob@client.com", "evil@x.com"], email_cc: ["new@client.com"] }), CTX, ["also cc new@client.com"]);
	assert.deepEqual(plan.email.to, ["bob@client.com"]);
	assert.deepEqual(plan.email.cc, ["new@client.com"]);
	assert.match(plan.warnings[0], /evil@x\.com/);
});

test("plan: no recipient, em dash, new deal without stage", () => {
	const plan = makePlan(draft({ email_to: [] }), CTX, []);
	assert.ok(plan.warnings.includes("No recipient. Send is off."));
	assert.equal(plan.email.body, "Hi Bob - notes.");
	const create = makePlan(draft({ deal_action: "create", deal_id: "", new_deal_name: "Client - data" }), CTX, []);
	assert.equal(create.deal_action, "create");
	assert.ok(create.warnings.some((w) => w.includes("no stage")));
});

test("coerce", () => {
	assert.equal(coerce({ title: "", type: "number" }, "1,500"), 1500);
	assert.equal(coerce({ title: "", type: "checkbox" }, "Yes"), true);
	assert.equal(coerce({ title: "", type: "date" }, "2026-10-20"), "2026-10-20");
	for (const [type, value] of [["date", "next week"], ["number", "12k"], ["number", "Infinity"]]) {
		assert.throws(() => coerce({ title: "", type }, value));
	}
});

test("transcript merge", () => {
	const segs = [
		{ speech: "Hi.", start_time: "58.4", speaker: { name: "Me" } },
		{ speech: "there", start_time: "59", speaker: { name: "Me" } },
		{ speech: "Hello", start_time: "61", speaker: { name: "Bob" } },
	];
	assert.equal(formatTranscript(segs), "[00:58] Me: Hi. there\n[01:01] Bob: Hello");
});

test("card status: two separate decisions", () => {
	assert.equal(cardStatus({}), "open");
	assert.equal(cardStatus({ crm: "applied" }), "open");
	assert.equal(cardStatus({ crm: "applied", email: "sending" }), "open");
	assert.equal(cardStatus({ crm: "applied", email: "gmail-id" }), "done");
	assert.equal(cardStatus({ crm: "skipped", email: "skipped" }), "skipped");
});

test("buttons", () => {
	assert.deepEqual(cardButtons("r1", 3, "crm").inline_keyboard[0].map((b) => b.callback_data), ["ca:r1:3", "cx:r1:3"]);
	assert.deepEqual(cardButtons("r1", 3, "email").inline_keyboard[0].map((b) => b.callback_data), ["es:r1:3", "ex:r1:3"]);
	assert.equal(cardButtons("r1", 3, "email", false).inline_keyboard[0].length, 1);
	assert.deepEqual(actionButtons(7).inline_keyboard[0].map((b) => b.callback_data), ["aa:7", "ax:7"]);
});

test("card render and message split", () => {
	const plan = makePlan(draft({ tasks: [{ content: "Me: send <prices>", due_date: "2026-10-20" }] }), CTX, []);
	const { crm, email } = renderCard(CTX, plan, 2);
	assert.match(crm[0], /v2/);
	assert.match(crm.join("\n"), /&lt;prices&gt;/);
	assert.match(email[0], /To: bob@client\.com/);
	const msgs = pack(["a".repeat(50), Array(40).fill("word ".repeat(30)).join("\n"), "b".repeat(10)], 300);
	assert.ok(msgs.every((m) => m.length <= 300));
	assert.equal(msgs.join("").split("a").length - 1, 50);
});

test("agent text to Telegram HTML", () => {
	assert.equal(agentHtml("**Deal** <x> `id-1`"), "<b>Deal</b> &lt;x&gt; <code>id-1</code>");
});

test("store: cards, actions, message map, costs", () => {
	const store = new Store(join(mkdtempSync(join(tmpdir(), "aca-")), "t.db"));
	store.insertCard("r1", "m1", "open", { version: 1, context: { a: 1 } });
	store.updateCard("r1", { result: { tasks: ["t1"] } });
	assert.deepEqual([store.card("r1").context, store.card("r1").result.tasks], [{ a: 1 }, ["t1"]]);
	assert.deepEqual(store.openCards().map((r: any) => r.recording_id), ["r1"]);
	const id = store.insertAction("chat", "task", { content: "x" });
	assert.equal(store.action(id).payload.content, "x");
	store.addMessages("card:r1", [10, 11]);
	assert.equal(store.sessionFor(11), "card:r1");
	store.addCost("card:r1", { input: 10, output: 5, cacheRead: 0, cost: 0.25 });
	assert.deepEqual(store.costSince("2000-01-01"), { cost: 0.25, calls: 1, cards: 1 });
});

test("signature and redaction helpers", () => {
	const body = Buffer.from('{"events":[]}');
	assert.equal(createHmac("sha256", "secret").update(body).digest("hex").length, 64);
	assert.equal(redact("https://api.telegram.org/bot123:ABC/sendMessage?x=1"), "https://api.telegram.org/bot***/sendMessage");
});
