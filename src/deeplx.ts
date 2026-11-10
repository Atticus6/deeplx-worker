type TranslateMethod = "Pro" | "Free";
type TranslateCode = 200 | 404 | 503;

interface DeepLXTranslateParams {
  sourceLang: string;
  targetLang: string;
  text: string;
  /** @deprecated The current oneshot endpoint has no tag handling; kept for API compatibility. */
  tagHandling?: string;
  /** @deprecated The current oneshot endpoint does not proxy; kept for API compatibility. */
  proxyURL?: string;
  /** @deprecated Login sessions are not used by the free oneshot endpoint. */
  dlSession?: string;
}

interface TranslateSuccessResponse {
  code: 200;
  id: number;
  data: string;
  alternatives: string[];
  source_lang: string;
  target_lang: string;
  method: TranslateMethod;
}

interface TranslateErrorResponse {
  code: Exclude<TranslateCode, 200>;
  message: string;
}

export type TranslateResponse =
  | TranslateSuccessResponse
  | TranslateErrorResponse;

interface DeepLOneshotResponse {
  translations?: Array<{
    text?: string;
    detected_source_language?: string;
  }>;
}

/**
 * DeepL translation client.
 *
 * ## Why not the old JSON-RPC endpoint
 *
 * `https://www2.deepl.com/jsonrpc` + `LMT_handle_texts` now answers with an
 * "You're using an older version of DeepL" notice instead of a translation.
 * The current anonymous path is DeepL's oneshot endpoint, which the web
 * client and the official mobile apps use:
 *
 *     POST https://oneshot-free.www.deepl.com/v1/translate
 *     Authorization: None
 *     Content-Type: application/json; charset=utf-8
 *
 *     { "text": ["Hello world"], "target_lang": "zh-Hans" }
 *
 * The public request/response shape of this Worker is unchanged, so existing
 * `/hi/translate` callers keep working. Upstream changes only need edits here.
 */
export class DeepLXTranslator {
  private static readonly API_URL =
    "https://oneshot-free.www.deepl.com/v1/translate";

  private static readonly TIMEOUT_MS = 15_000;

  /**
   * Target language aliases. oneshot expects BCP-47 codes (`zh-Hans`,
   * `en-US`, `pt-BR`), while callers use the shorter DeepLX codes.
   */
  private static readonly TARGET_LANG_MAP: Record<string, string> = {
    ZH: "zh-Hans",
    "ZH-HANS": "zh-Hans",
    "ZH-HANT": "zh-Hant",
    EN: "en-US",
    "EN-US": "en-US",
    "EN-GB": "en-GB",
    PT: "pt-BR",
    "PT-BR": "pt-BR",
    "PT-PT": "pt-PT",
    ES: "es",
    "ES-419": "es-419",
    "FR-CA": "fr-CA",
    "DE-CH": "de-CH",
  };

  async translate(params: DeepLXTranslateParams): Promise<TranslateResponse> {
    const { text } = params;

    if (!text) {
      return {
        code: 404,
        message: "No text to translate",
      };
    }

    const id = this.getRandomNumber();
    const targetLang = this.toTargetLang(params.targetLang);
    const sourceLang = this.toSourceLang(params.sourceLang);

    const body: {
      text: string[];
      target_lang: string;
      source_lang?: string;
      usage_type: string;
    } = {
      text: [text],
      target_lang: targetLang,
      usage_type: "translate",
    };
    if (sourceLang) {
      body.source_lang = sourceLang;
    }

    let response: Response;
    try {
      response = await fetch(DeepLXTranslator.API_URL, {
        method: "POST",
        headers: {
          // Anonymous requests must send the literal value `None`.
          Authorization: "None",
          "Content-Type": "application/json; charset=utf-8",
          Accept: "*/*",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(DeepLXTranslator.TIMEOUT_MS),
      });
    } catch (err) {
      return {
        code: 503,
        message: err instanceof Error ? err.message : String(err),
      };
    }

    if (response.status === 429) {
      return {
        code: 503,
        message:
          "too many requests, your IP has been blocked by DeepL temporarily, please don't request it frequently in a short time",
      };
    }

    if (response.status !== 200) {
      return {
        code: 503,
        message: `request failed with status code: ${response.status}`,
      };
    }

    let result: DeepLOneshotResponse;
    try {
      result = (await response.json()) as DeepLOneshotResponse;
    } catch {
      return {
        code: 503,
        message: "Translation failed",
      };
    }

    const translation = result.translations?.[0];
    if (!translation?.text) {
      return {
        code: 503,
        message: "Translation failed",
      };
    }

    return {
      code: 200,
      id,
      data: translation.text,
      // The oneshot endpoint does not return alternative translations.
      alternatives: [],
      source_lang: (
        translation.detected_source_language ||
        sourceLang ||
        "auto"
      ).toUpperCase(),
      target_lang: params.targetLang.toUpperCase(),
      method: "Free",
    };
  }

  private toTargetLang(code: string): string {
    const upper = code.toUpperCase();
    return DeepLXTranslator.TARGET_LANG_MAP[upper] ?? upper.toLowerCase();
  }

  /**
   * `auto` (and an empty source) omits `source_lang`, letting DeepL detect the
   * language itself. Chinese script variants must be reduced to `zh`; sent as
   * a source hint, `zh-Hans` / `zh-Hant` are ignored upstream.
   */
  private toSourceLang(code: string): string | undefined {
    const upper = (code || "").toUpperCase();
    if (!upper || upper === "AUTO") {
      return undefined;
    }
    if (upper === "ZH" || upper === "ZH-HANS" || upper === "ZH-HANT") {
      return "zh";
    }
    if (upper === "EN" || upper === "EN-US" || upper === "EN-GB") {
      return "en";
    }
    if (upper === "PT" || upper === "PT-BR" || upper === "PT-PT") {
      return "pt";
    }
    return upper.toLowerCase();
  }

  private getRandomNumber(): number {
    const num = Math.floor(Math.random() * 99999) + 100000;
    return num * 1000;
  }
}

/**
 * @example deepLXTranslator.translate({sourceLang:"auto",targetLang:"ZH",text:"Hello world"})
 */
export const deepLXTranslator = new DeepLXTranslator();
