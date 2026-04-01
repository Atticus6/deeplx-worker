import { Context, Hono } from "hono";
import { zValidator } from "./zod-validator";
import z from "zod";
import { deepLXTranslator } from "./deeplx";
import { bearerAuth } from "hono/bearer-auth";

type Env = { Bindings: Cloudflare.Env };

const app = new Hono<Env>().basePath("/hi");
// bearerAuth1 validates the Authorization header in the form:
// Authorization: Bearer <TOKEN>. If TOKEN is not configured, auth is skipped.
const bearerAuth1 = bearerAuth({
  verifyToken: async (token, c: Context<Env>) => {
    if (!c.env.TOKEN) {
      return true;
    }
    return token === c.env.TOKEN;
  },
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
