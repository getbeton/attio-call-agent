// Gmail: send one plain-text email with a refresh token that has the gmail.send scope only.
import { ApiError, DRY_RUN, env, http } from "./net.ts";

let token = { value: "", exp: 0 };

async function accessToken(): Promise<string> {
	if (Date.now() > token.exp - 60_000) {
		const body = new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), refresh_token: env("GMAIL_REFRESH_TOKEN"), grant_type: "refresh_token" });
		const res = await http("POST", "https://oauth2.googleapis.com/token", { body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
		token = { value: res.access_token, exp: Date.now() + (res.expires_in ?? 3600) * 1000 };
	}
	return token.value;
}

// RFC 2047 for non-ASCII header values (Russian subjects and names).
const header = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`);

export type Email = { sender: string; to: string[]; cc: string[]; subject: string; body: string };

export async function sendEmail(email: Email): Promise<string> {
	if (DRY_RUN) throw new ApiError("DRY_RUN: refused to send email");
	const name = process.env.SENDER_NAME;
	const lines = [
		`From: ${name ? `${header(name)} <${email.sender}>` : email.sender}`,
		`To: ${email.to.join(", ")}`,
		...(email.cc.length ? [`Cc: ${email.cc.join(", ")}`] : []),
		`Subject: ${header(email.subject)}`,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: base64",
		"",
		Buffer.from(email.body).toString("base64").replace(/.{76}/g, "$&\r\n"),
	];
	const raw = Buffer.from(lines.join("\r\n")).toString("base64url");
	const res = await http("POST", "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { headers: { Authorization: `Bearer ${await accessToken()}` }, json: { raw }, retries: 1 });
	return res.id;
}
