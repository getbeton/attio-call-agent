// State in SQLite (node:sqlite, no package). The Pi sessions themselves are JSONL files next to it.
import { DatabaseSync } from "node:sqlite";

const JSON_COLS = new Set(["context", "plan", "result", "payload"]);
const now = () => new Date().toISOString();

export class Store {
	db: DatabaseSync;

	constructor(path: string) {
		this.db = new DatabaseSync(path);
		this.db.exec(`
			create table if not exists meta (key text primary key, value text);
			create table if not exists cards (
				recording_id text primary key, meeting_id text not null, status text not null, version integer not null default 0,
				session_file text, context text, plan text, result text, crm_message_id integer, email_message_id integer,
				error text, created_at text not null, updated_at text not null);
			create table if not exists actions (
				id integer primary key autoincrement, session_key text not null, kind text not null, payload text not null,
				status text not null, message_id integer, result text, error text, created_at text not null, updated_at text not null);
			create table if not exists messages (message_id integer primary key, session_key text not null);
			create table if not exists ledger (at text not null, session_key text not null, input integer, output integer, cache_read integer, cost real);
		`);
	}

	private parse(row: any) {
		if (!row) return null;
		for (const k of Object.keys(row)) if (JSON_COLS.has(k) && row[k]) row[k] = JSON.parse(row[k]);
		return row;
	}

	private cols(cols: Record<string, unknown>) {
		return Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, JSON_COLS.has(k) && v != null ? JSON.stringify(v) : (v ?? null)]));
	}

	meta(key: string): string | null {
		return (this.db.prepare("select value from meta where key = ?").get(key) as any)?.value ?? null;
	}

	setMeta(key: string, value: string) {
		this.db.prepare("insert or replace into meta values (?, ?)").run(key, value);
	}

	card(rid: string) {
		return this.parse(this.db.prepare("select * from cards where recording_id = ?").get(rid));
	}

	insertCard(rid: string, mid: string, status: string, cols: Record<string, unknown> = {}) {
		const all = this.cols({ recording_id: rid, meeting_id: mid, status, created_at: now(), updated_at: now(), ...cols });
		this.db.prepare(`insert or replace into cards (${Object.keys(all).join(", ")}) values (${Object.keys(all).map(() => "?").join(", ")})`).run(...(Object.values(all) as any[]));
	}

	updateCard(rid: string, cols: Record<string, unknown>) {
		const all = this.cols({ ...cols, updated_at: now() });
		this.db.prepare(`update cards set ${Object.keys(all).map((k) => `${k} = ?`).join(", ")} where recording_id = ?`).run(...(Object.values(all) as any[]), rid);
	}

	openCards() {
		return (this.db.prepare("select * from cards where status = 'open' order by updated_at").all() as any[]).map((r) => this.parse(r));
	}

	recentCards(sinceIso: string) {
		return (this.db.prepare("select * from cards where created_at >= ? and status != 'ignored' order by created_at desc").all(sinceIso) as any[]).map((r) => this.parse(r));
	}

	insertAction(sessionKey: string, kind: string, payload: unknown): number {
		const res = this.db.prepare("insert into actions (session_key, kind, payload, status, created_at, updated_at) values (?, ?, ?, 'proposed', ?, ?)")
			.run(sessionKey, kind, JSON.stringify(payload), now(), now());
		return Number(res.lastInsertRowid);
	}

	action(id: number) {
		return this.parse(this.db.prepare("select * from actions where id = ?").get(id));
	}

	updateAction(id: number, cols: Record<string, unknown>) {
		const all = this.cols({ ...cols, updated_at: now() });
		this.db.prepare(`update actions set ${Object.keys(all).map((k) => `${k} = ?`).join(", ")} where id = ?`).run(...(Object.values(all) as any[]), id);
	}

	addMessages(sessionKey: string, ids: number[]) {
		const stmt = this.db.prepare("insert or replace into messages values (?, ?)");
		for (const id of ids) stmt.run(id, sessionKey);
	}

	sessionFor(messageId: number): string | null {
		return (this.db.prepare("select session_key from messages where message_id = ?").get(messageId) as any)?.session_key ?? null;
	}

	addCost(sessionKey: string, u: { input: number; output: number; cacheRead: number; cost: number }) {
		this.db.prepare("insert into ledger values (?, ?, ?, ?, ?, ?)").run(now(), sessionKey, u.input, u.output, u.cacheRead, u.cost);
	}

	costSince(sinceIso: string): { cost: number; calls: number; cards: number } {
		const row = this.db.prepare(`select coalesce(sum(cost), 0) as cost, count(*) as calls,
			count(distinct case when session_key like 'card:%' then session_key end) as cards from ledger where at >= ?`).get(sinceIso) as any;
		return { cost: row.cost, calls: row.calls, cards: row.cards };
	}
}
