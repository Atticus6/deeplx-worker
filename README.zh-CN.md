[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Atticus6/deeplx-worker)

# deeplx-worker

[English README](./README.md)

基于 Cloudflare Workers 和 Hono 的轻量 DeepLX 翻译服务，提供一个简单的 HTTP API，将文本转发到 DeepL Web JSON-RPC 接口并返回翻译结果。

## 功能

- 提供统一翻译接口：`POST /hi/translate`
- 支持自动识别源语言：`sourceLang = auto`
- 返回主翻译结果、候选替代翻译、源语言、目标语言和调用方式

## 路由

- 静态首页：`/`
- 翻译接口：`/hi/translate`

## 快速开始

要求：

- Cloudflare Wrangler

安装依赖：

```bash
npm install
```

安装并登录 Wrangler：

```bash
npm install -g wrangler
wrangler login
```

部署：

```bash
npm run deploy
```

## 请求格式

请求头：

```http
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

鉴权说明：

- `bearerAuth1` 是 `src/index.ts` 中使用的 Bearer Token 鉴权中间件
- 当 Worker 环境中配置了 `TOKEN` 时，请携带 `Authorization: Bearer <TOKEN>`
- 如果未配置 `TOKEN`，则 `bearerAuth1` 会跳过鉴权，允许匿名请求

请求体：

```json
{
  "sourceLang": "auto",
  "targetLang": "ZH",
  "text": "Hello world"
}
```

字段说明：

- `sourceLang`：源语言，例如 `EN`、`ZH`、`JA`、`KO`，也可使用 `auto`
- `targetLang`：目标语言，例如 `EN`、`ZH`
- `text`：待翻译文本

## 返回示例

成功：

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

失败：

```json
{
  "code": 503,
  "message": "Translation failed"
}
```

## 调用示例

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

## 注意事项

- 当前实际暴露的接口只有 `POST /hi/translate`
- 配置 `TOKEN` 后，`bearerAuth1` 会校验 `Authorization: Bearer <TOKEN>` 请求头
- `sourceLang=auto` 使用项目内置的简单判断逻辑
- Cloudflare Workers 环境下如果请求过于频繁，可能触发 DeepL 的限流或封禁
- 本项目依赖 DeepL Web 接口的可用性，接口变动可能导致服务失效

## License

MIT
