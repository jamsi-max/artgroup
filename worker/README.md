# Contact Form → Telegram (Cloudflare Worker)

A minimal Cloudflare Worker that receives a contact-form submission and
forwards it to a Telegram chat via the Bot API. The bot token and chat id
are never exposed to the browser — they live only as Worker secrets.

## How it works

- `POST /` with `Content-Type: application/json` or
  `application/x-www-form-urlencoded`.
- Required fields: `name`, `message`, and at least one of `email` / `phone`.
- Any other fields you send are forwarded too (allowlisted key format,
  bounded count and length) so the form can carry extra context (e.g.
  `subject`, `company`) without code changes.
- On success: `200 { "success": true, "message": "..." }`
- On validation error: `400 { "success": false, "error": "..." }`
- On Telegram/network failure: `502 { "success": false, "error": "..." }`
- Requests over ~25 KB, from disallowed origins, or with the wrong method
  are rejected before anything is sent to Telegram.

## 1. Create a Telegram bot

1. Open a chat with [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` and follow the prompts (choose a name and a username).
3. BotFather replies with a token that looks like
   `123456789:AA...`. This is your `TELEGRAM_BOT_TOKEN` — keep it secret.

## 2. Get the chat id

Pick whichever fits your use case:

- **Personal chat**: send any message to your new bot, then open
  `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and look
  for `"chat":{"id": ...}` in the response.
- **Group chat**: add the bot to the group, send a message in the group,
  then open the same `getUpdates` URL. Group chat ids are negative numbers
  (e.g. `-1001234567890`).

This value is your `TELEGRAM_CHAT_ID`.

## 3. Install dependencies

```bash
cd worker
npm install
```

## 4. Configure

Edit `wrangler.toml` and set `ALLOWED_ORIGINS` to the real origin(s) of the
site that will call this Worker (comma-separated, no trailing slash):

```toml
[vars]
ALLOWED_ORIGINS = "https://artgroup.fun,https://www.artgroup.fun"
```

Then add the two secrets (you'll be prompted to paste each value —
they are not stored in any file):

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

## 5. Test locally

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars with a real bot token / chat id for testing
npm run dev
```

`.dev.vars` is gitignored and is only read by `wrangler dev`; it never
gets deployed. With `ALLOWED_ORIGINS=*` in `.dev.vars` you can test with
curl directly:

```bash
curl -X POST http://127.0.0.1:8787/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","message":"Hello!"}'
```

## 6. Deploy

```bash
npm run deploy
```

Wrangler prints the deployed URL, e.g.
`https://contact-form-worker.<your-subdomain>.workers.dev`. Use that as
the form's submission endpoint (or map it to a custom route/domain in the
Cloudflare dashboard).

## Example HTML form

```html
<form id="contact-form">
  <input type="text" name="name" placeholder="Your name" required />
  <input type="email" name="email" placeholder="Your email" />
  <input type="tel" name="phone" placeholder="Your phone" />
  <textarea name="message" placeholder="Message" required></textarea>
  <button type="submit">Send</button>
</form>
<p id="contact-form-status"></p>

<script>
  const WORKER_URL = "https://contact-form-worker.artgroup.workers.dev";
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-form-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending...";

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await res.json();

      status.textContent = data.success
        ? "Thanks! Your message has been sent."
        : data.error || "Something went wrong. Please try again.";
      if (data.success) form.reset();
    } catch {
      status.textContent = "Network error. Please try again.";
    }
  });
</script>
```

## Notes

- Free tier is more than enough for a contact form: this Worker does a
  single outbound `fetch` per request and holds nothing in memory beyond
  the ~25 KB request body cap.
- `ALLOWED_ORIGINS` is a plain (non-secret) variable because it only lists
  permitted site origins — it's safe to commit in `wrangler.toml`.
- Never set `ALLOWED_ORIGINS=*` in production; it disables the
  origin check entirely and lets any site relay messages through your bot.
