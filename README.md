[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Atticus6/deeplx-worker)

# deeplx-worker

[中文文档](./README.zh-CN.md)

A lightweight translation service deployed on Cloudflare Workers. After deployment, you can call a single HTTP API to translate text with DeepLX.

## What It Does

- Single translation endpoint: `POST /hi/translate`
- Supports automatic source language detection with `sourceLang = auto`
- Returns translated text together with alternative results and language info

## API Endpoint

- Home page: `/`
- Translation API: `/hi/translate`

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
- `targetLang`: target language such as `EN`, `ZH`
- `text`: the text you want to translate

## Response

Success:

```json
{
  "code": 200,
  "id": 123456000,
  "data": "你好，世界",
  "alternatives": ["你好世界", "世界你好"],
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
- `sourceLang=auto` uses a simple built-in heuristic
- Frequent requests may trigger rate limiting or temporary blocking from DeepL
- This project depends on the availability of the DeepL web endpoint, so upstream changes may break it

## License

MIT
