import { Hono } from "hono";
import { zValidator } from "./zod-validator";
import z from "zod";
import { deepLXTranslator } from "./deeplx";

const app = new Hono().basePath("/hi");

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
  async (c) => {
    const data = c.req.valid("json");
    const res = await deepLXTranslator.translate(data);
    return c.json(res,{status:res.code});
  },
);

export default app;
