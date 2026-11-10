import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import z from "zod";
import { deepLXTranslator } from "./deeplx";
import { zValidator } from "./zod-validator";

type Env = { Bindings: Cloudflare.Env };

const app = new Hono<Env>().basePath("/hi");

/**
 * Optional bearer auth.
 *
 * - `TOKEN` configured: require `Authorization: Bearer <TOKEN>`.
 * - `TOKEN` absent: let anonymous requests through. The previous `bearerAuth`
 *   middleware still demanded a header even when the token was not configured,
 *   which made the "anonymous when no TOKEN" behavior in the README untrue.
 */
const bearerAuth1 = createMiddleware<Env>(async (c, next) => {
  const token = c.env.TOKEN;
  if (!token) {
    await next();
    return;
  }

  if (c.req.header("Authorization") !== `Bearer ${token}`) {
    return c.text("Unauthorized", 401);
  }

  await next();
});

app.post(
  "/translate",
  zValidator(
    "json",
    z.object({
      sourceLang: z.string().min(1),
      targetLang: z.string().min(1),
      text: z.string().min(1),
    }),
  ),
  bearerAuth1,

  async (c) => {
    const data = c.req.valid("json");
    const res = await deepLXTranslator.translate(data);
    return c.json(res, { status: res.code });
  },
);

export default app;
