// HTTP with retries, and env helpers. Every outside call goes through http().

export class ApiError extends Error {}

export function env(name: string, fallback?: string): string {
	const value = process.env[name] ?? fallback;
	if (value === undefined || value === "") throw new Error(`missing env var ${name}`);
	return value;
}

export function envList(name: string): string[] {
	return (process.env[name] ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}

export const DRY_RUN = process.env.DRY_RUN === "1";

export function redact(url: string): string {
	return url.split("?")[0].replace(/\/bot[^/]+\//, "/bot***/");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type HttpOptions = {
	headers?: Record<string, string>;
	json?: unknown;
	body?: BodyInit;
	timeoutMs?: number;
	retries?: number; // use 1 for calls that create things
	raw?: boolean;
};

/** JSON over HTTP. Retries 429, 5xx and network errors. */
export async function http(method: string, url: string, opts: HttpOptions = {}): Promise<any> {
	const headers = { ...(opts.headers ?? {}) };
	let body = opts.body;
	if (opts.json !== undefined) {
		body = JSON.stringify(opts.json);
		headers["Content-Type"] = "application/json";
	}
	const retries = opts.retries ?? 3;
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000) });
			if (res.ok) {
				if (opts.raw) return Buffer.from(await res.arrayBuffer());
				const text = await res.text();
				return text ? JSON.parse(text) : {};
			}
			const detail = (await res.text()).slice(0, 400);
			if ([429, 500, 502, 503, 504].includes(res.status) && attempt < retries) {
				await sleep(Number(res.headers.get("retry-after")) * 1000 || 2 ** attempt * 1000);
				continue;
			}
			throw new ApiError(`${method} ${redact(url)} -> ${res.status}: ${detail}`);
		} catch (e) {
			if (e instanceof ApiError) throw e;
			if (attempt < retries) {
				await sleep(2 ** attempt * 1000);
				continue;
			}
			throw new ApiError(`${method} ${redact(url)} -> ${(e as Error).message}`);
		}
	}
}
