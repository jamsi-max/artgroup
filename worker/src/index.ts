/**
 * Cloudflare Worker that receives a contact-form submission and forwards it
 * to a Telegram chat via the Bot API. The bot token and chat id live only in
 * Worker secrets — the client never sees them.
 */

export interface Env {
	TELEGRAM_BOT_TOKEN: string;
	TELEGRAM_CHAT_ID: string;
	/** Comma-separated list of allowed origins, e.g. "https://example.com,https://www.example.com". */
	ALLOWED_ORIGINS: string;
}

const MAX_BODY_BYTES = 25 * 1024; // 25 KB is generous for a contact form
const MAX_FIELD_LEN = 2000;
const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 254;
const MAX_PHONE_LEN = 30;
const MAX_EXTRA_FIELDS = 10;
const KNOWN_FIELDS = new Set(['name', 'email', 'phone', 'message']);
const EXTRA_KEY_PATTERN = /^[a-zA-Z0-9_ -]{1,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Honeypot fields: hidden off-screen in the form markup, so only a bot that
// fills in every field ever sets one. Never forwarded to Telegram, whether
// filled in or not.
const HONEYPOT_FIELDS = new Set(['website', 'hp']);

type Fields = Record<string, string>;

class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get('Origin');
		const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
		const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		try {
			if (request.method !== 'POST') {
				throw new HttpError(405, 'Method not allowed');
			}

			// Origin enforcement: browsers already respect the CORS headers above,
			// but a direct (non-browser) caller ignores those, so check server-side
			// too. Setting ALLOWED_ORIGINS to "*" opts out — useful for local
			// testing with curl, not recommended in production.
			if (!allowedOrigins.has('*') && (!origin || !allowedOrigins.has(origin))) {
				throw new HttpError(403, 'Origin not allowed');
			}

			const raw = await readBody(request);

			// A filled honeypot means a bot, not a visitor: report success so it
			// moves on, but never actually forward the message to Telegram.
			if (isHoneypotTriggered(raw)) {
				return jsonResponse(200, { success: true, message: 'Message sent successfully' }, corsHeaders);
			}

			const fields = normalizeFields(raw);
			validate(fields);

			const text = formatTelegramMessage(fields);
			await sendToTelegram(env, text);

			return jsonResponse(200, { success: true, message: 'Message sent successfully' }, corsHeaders);
		} catch (err) {
			if (err instanceof HttpError) {
				return jsonResponse(err.status, { success: false, error: err.message }, corsHeaders);
			}
			// Never leak internal error details (stack traces, upstream bodies, etc).
			console.error('Unexpected error handling contact form submission:', err);
			return jsonResponse(500, { success: false, error: 'Internal server error' }, corsHeaders);
		}
	},
};

function parseAllowedOrigins(raw: string | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean),
	);
}

function buildCorsHeaders(origin: string | null, allowedOrigins: Set<string>): HeadersInit {
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		Vary: 'Origin',
	};
	if (allowedOrigins.has('*')) {
		headers['Access-Control-Allow-Origin'] = '*';
	} else if (origin && allowedOrigins.has(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
	}
	return headers;
}

/** Reads the request body under a hard byte cap, then parses it as JSON or urlencoded form data. */
async function readBody(request: Request): Promise<Record<string, unknown>> {
	const contentLength = request.headers.get('Content-Length');
	if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
		throw new HttpError(413, 'Request body too large');
	}

	const raw = await readBodyCapped(request);

	const contentType = request.headers.get('Content-Type') ?? '';
	if (contentType.includes('application/json')) {
		let parsed: unknown;
		try {
			parsed = raw ? JSON.parse(raw) : {};
		} catch {
			throw new HttpError(400, 'Invalid JSON body');
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			throw new HttpError(400, 'Request body must be a JSON object');
		}
		return parsed as Record<string, unknown>;
	}

	if (contentType.includes('application/x-www-form-urlencoded')) {
		const params = new URLSearchParams(raw);
		const obj: Record<string, unknown> = {};
		for (const [key, value] of params) obj[key] = value;
		return obj;
	}

	throw new HttpError(415, 'Content-Type must be application/json or application/x-www-form-urlencoded');
}

function isHoneypotTriggered(obj: Record<string, unknown>): boolean {
	for (const key of HONEYPOT_FIELDS) {
		const value = obj[key];
		if (typeof value === 'string' && value.trim() !== '') return true;
	}
	return false;
}

/** Streams the body and aborts as soon as it exceeds the cap, guarding against a missing or spoofed Content-Length. */
async function readBodyCapped(request: Request): Promise<string> {
	if (!request.body) return '';

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > MAX_BODY_BYTES) {
			await reader.cancel();
			throw new HttpError(413, 'Request body too large');
		}
		chunks.push(value);
	}

	return new TextDecoder().decode(concatChunks(chunks, total));
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
	const out = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.length;
	}
	return out;
}

/** Only known fields keep their name; anything else is treated as an "extra" field, allowlisted and bounded. */
function normalizeFields(obj: Record<string, unknown>): Fields {
	const fields: Fields = {};
	let extraCount = 0;

	for (const [key, rawValue] of Object.entries(obj)) {
		if (HONEYPOT_FIELDS.has(key)) continue;
		if (typeof rawValue !== 'string') continue;
		const value = rawValue.trim();
		if (!value) continue;

		if (KNOWN_FIELDS.has(key)) {
			fields[key] = value.slice(0, MAX_FIELD_LEN);
			continue;
		}

		if (extraCount >= MAX_EXTRA_FIELDS) continue;
		if (!EXTRA_KEY_PATTERN.test(key)) continue;
		fields[key] = value.slice(0, MAX_FIELD_LEN);
		extraCount++;
	}

	return fields;
}

function validate(fields: Fields): void {
	if (!fields.name) {
		throw new HttpError(400, 'Field "name" is required');
	}
	if (fields.name.length > MAX_NAME_LEN) {
		throw new HttpError(400, 'Field "name" is too long');
	}

	if (!fields.email && !fields.phone) {
		throw new HttpError(400, 'Either "email" or "phone" is required');
	}
	if (fields.email) {
		if (fields.email.length > MAX_EMAIL_LEN || !EMAIL_PATTERN.test(fields.email)) {
			throw new HttpError(400, 'Field "email" is invalid');
		}
	}
	if (fields.phone && fields.phone.length > MAX_PHONE_LEN) {
		throw new HttpError(400, 'Field "phone" is too long');
	}

	if (!fields.message) {
		throw new HttpError(400, 'Field "message" is required');
	}
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const EXTRA_FIELD_LABELS: Record<string, string> = {
	name: '👤 Имя',
	email: '📧 Email',
	phone: '📞 Телефон',
	message: '💬 Комментарий',
};

function formatMoscowTimestamp(date: Date): string {
	const parts = new Intl.DateTimeFormat('ru-RU', {
		timeZone: 'Europe/Moscow',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).formatToParts(date);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
}

function formatTelegramMessage(fields: Fields): string {
	const lines = ['📩 <b>Новая заявка — сайт Art Group</b>', ''];

	for (const key of ['name', 'email', 'phone', 'message']) {
		const value = fields[key];
		if (!value) continue;
		lines.push(`${EXTRA_FIELD_LABELS[key]}: ${escapeHtml(value)}`);
	}

	const extraKeys = Object.keys(fields).filter((k) => !KNOWN_FIELDS.has(k));
	if (extraKeys.length > 0) {
		lines.push('');
		for (const key of extraKeys) {
			lines.push(`▪️ <b>${escapeHtml(key)}:</b> ${escapeHtml(fields[key])}`);
		}
	}

	lines.push('', `🕒 ${formatMoscowTimestamp(new Date())} МСК`);

	return lines.join('\n');
}

async function sendToTelegram(env: Env, text: string): Promise<void> {
	const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 8000);

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: env.TELEGRAM_CHAT_ID,
				text,
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			}),
			signal: controller.signal,
		});
	} catch {
		throw new HttpError(502, 'Failed to reach Telegram');
	} finally {
		clearTimeout(timeout);
	}

	if (!response.ok) {
		// Do not forward Telegram's response body to the client — it can echo
		// back request details and must never leak the bot token.
		console.error(`Telegram API returned status ${response.status}`);
		throw new HttpError(502, 'Failed to deliver message');
	}
}

function jsonResponse(status: number, body: unknown, corsHeaders: HeadersInit): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}
