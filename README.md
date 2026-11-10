[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Atticus6/deeplx-worker)

# deeplx-worker

[中文文档](./README.zh-CN.md)

A lightweight translation service deployed on Cloudflare Workers. After deployment, you can call a single HTTP API to translate text with DeepL's anonymous oneshot endpoint.

## What It Does

- Single translation endpoint: `POST /hi/translate`
- Supports automatic source language detection with `sourceLang = auto`
- Returns the translated text, source/target language and method. `alternatives` is kept for DeepLX compatibility and is always an empty array.

## API Endpoint

- Home page: `/`
- Translation API: `/hi/translate`

## Public API

After deployment, the only public endpoint is:

```http
POST https://<your-worker-domain>/hi/translate
Content-Type: application/json
```

It accepts the JSON body documented below and returns the DeepLX-compatible
response. If the `TOKEN` binding is not configured, the endpoint is anonymous;
if it is configured, send `Authorization: Bearer <TOKEN>`.

## Quick Start

Install dependencies:

```bash
npm install
```

Install Wrangler and log in to Cloudflare:

```bash
npm install -g wrangler
wrangler login
```

Deploy the Worker:

```bash
npm run deploy
```

## Request

Headers:

```http
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

Authentication:

- `bearerAuth1` is the bearer-token auth middleware used by `src/index.ts`
- Send `Authorization: Bearer <TOKEN>` when `TOKEN` is configured in the Worker environment
- If `TOKEN` is not configured, `bearerAuth1` allows requests without authentication

Body:

```json
{
  "sourceLang": "auto",
  "targetLang": "ZH",
  "text": "Hello world"
}
```

Fields:

- `sourceLang`: source language such as `EN`, `ZH`, `JA`, `KO`, or `auto`
- `targetLang`: target language such as `EN`, `ZH` (it cannot be `auto`)
- `text`: the text you want to translate (about 1500 characters max on the anonymous endpoint)

## Response

Success:

```json
{
  "code": 200,
  "id": 123456000,
  "data": "你好，世界",
  "alternatives": [],
  "source_lang": "EN",
  "target_lang": "ZH",
  "method": "Free"
}
```

Failure:

```json
{
  "code": 503,
  "message": "Translation failed"
}
```

## Usage Example

```bash
curl -X POST https://your-worker-domain/hi/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "sourceLang": "auto",
    "targetLang": "ZH",
    "text": "Hello world"
  }'
```

## Notes

- The public API is `POST /hi/translate`
- `bearerAuth1` checks the `Authorization: Bearer <TOKEN>` header when `TOKEN` is configured
- `sourceLang=auto` omits `source_lang` and lets DeepL detect the language
- `alternatives` is always `[]`: the oneshot endpoint does not return alternative translations
- Frequent requests may trigger rate limiting or temporary blocking from DeepL
- The upstream is DeepL's anonymous oneshot endpoint (`https://oneshot-free.www.deepl.com/v1/translate`). The old `www2.deepl.com/jsonrpc` + `LMT_handle_texts` path now returns an "update DeepL" notice instead of a translation, so `src/deeplx.ts` no longer uses it. Upstream changes only need edits in that file

## License

MIT
