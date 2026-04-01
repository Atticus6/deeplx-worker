type TranslateMethod = "Pro" | "Free";
type TranslateCode = 200 | 404 | 503;

interface DeepLXTranslateParams {
  sourceLang: string;
  targetLang: string;
  text: string;
  tagHandling?: string;
  proxyURL?: string;
  dlSession?: string;
}

interface DeepLXAlternative {
  text?: string;
}

interface DeepLXTextResult {
  text?: string;
  alternatives?: DeepLXAlternative[];
}

interface DeepLXResponse {
  result?: {
    texts?: DeepLXTextResult[];
    lang?: string;
  };
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

interface DeepLXRequestBody {
  jsonrpc: "2.0";
  method: "LMT_handle_texts";
  id: number;
  params: {
    splitting: "newlines";
    lang: {
      source_lang_user_selected: string;
      target_lang: string;
    };
    texts: Array<{
      text: string;
      requestAlternatives: 3;
    }>;
    timestamp: number;
    tag_handling?: string;
  };
}

export class DeepLXTranslator {
  private static readonly API_URL = "https://www2.deepl.com/jsonrpc";

  async translate(params: DeepLXTranslateParams): Promise<TranslateResponse> {
    const {
      targetLang,
      text,
      tagHandling = "",
      proxyURL = "",
      dlSession = "",
    } = params;

    if (!text) {
      return {
        code: 404,
        message: "No text to translate",
      };
    }

    let sourceLang = params.sourceLang;
    if (!sourceLang || sourceLang === "auto") {
      sourceLang = this.detectLangSimple(text);
    }

    const id = this.getRandomNumber();
    const timestamp = this.getTimeStamp(this.getICount(text));
    const postData = this.buildRequestBody({
      id,
      sourceLang,
      targetLang,
      text,
      timestamp,
      tagHandling,
    });

    let result: DeepLXResponse;
    try {
      result = await this.makeRequestWithBody(
        this.formatRequestBody(id, JSON.stringify(postData)),
        proxyURL,
        dlSession,
      );
    } catch (err) {
      return {
        code: 503,
        message: err instanceof Error ? err.message : String(err),
      };
    }

    const texts = result.result?.texts;
    const firstText = texts?.[0];
    const mainText = firstText?.text;

    if (!Array.isArray(texts) || texts.length === 0 || !mainText) {
      return {
        code: 503,
        message: "Translation failed",
      };
    }

    const alternatives = Array.isArray(firstText.alternatives)
      ? firstText.alternatives
          .map((item): string | undefined => item.text)
          .filter((item): item is string => Boolean(item))
      : [];

    return {
      code: 200,
      id,
      data: mainText,
      alternatives,
      source_lang: result.result?.lang || sourceLang,
      target_lang: targetLang,
      method: dlSession ? "Pro" : "Free",
    };
  }

  private buildRequestBody(input: {
    id: number;
    sourceLang: string;
    targetLang: string;
    text: string;
    timestamp: number;
    tagHandling: string;
  }): DeepLXRequestBody {
    const body: DeepLXRequestBody = {
      jsonrpc: "2.0",
      method: "LMT_handle_texts",
      id: input.id,
      params: {
        splitting: "newlines",
        lang: {
          source_lang_user_selected: input.sourceLang,
          target_lang: input.targetLang,
        },
        texts: [
          {
            text: input.text,
            requestAlternatives: 3,
          },
        ],
        timestamp: input.timestamp,
      },
    };

    if (input.tagHandling) {
      body.params.tag_handling = input.tagHandling;
    }

    return body;
  }

  private getICount(text: string): number {
    const matches = text.match(/i/g);
    return matches ? matches.length : 0;
  }

  private getRandomNumber(): number {
    const num = Math.floor(Math.random() * 99999) + 100000;
    return num * 1000;
  }

  private getTimeStamp(iCount: number): number {
    const ts = Date.now();
    if (iCount !== 0) {
      const n = iCount + 1;
      return ts - (ts % n) + n;
    }
    return ts;
  }

  private formatRequestBody(id: number, body: string): string {
    const useAlt = (id + 5) % 29 === 0 || (id + 3) % 13 === 0;
    if (useAlt) {
      return body.replace('"method":"', '"method" : "');
    }
    return body.replace('"method":"', '"method": "');
  }

  private detectLangSimple(text: string): string {
    if (/[\u4e00-\u9fff]/.test(text)) return "ZH";
    if (/[\u3040-\u30ff]/.test(text)) return "JA";
    if (/[\uac00-\ud7af]/.test(text)) return "KO";
    return "EN";
  }

  private async makeRequestWithBody(
    postStr: string,
    proxyURL = "",
    dlSession = "",
  ): Promise<DeepLXResponse> {
    const headers: HeadersInit & Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      Origin: "https://www.deepl.com",
      Referer: "https://www.deepl.com/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
    };

    if (dlSession) {
      headers.Cookie = `dl_session=${dlSession}`;
    }

    if (proxyURL) {
      console.warn(
        "proxyURL is passed, but this Bun JS version does not directly wire proxy into fetch.",
      );
    }

    const resp = await fetch(DeepLXTranslator.API_URL, {
      method: "POST",
      headers,
      body: postStr,
    });

    if (resp.status === 429) {
      throw new Error(
        "too many requests, your IP has been blocked by DeepL temporarily, please don't request it frequently in a short time",
      );
    }

    if (resp.status !== 200) {
      throw new Error(`request failed with status code: ${resp.status}`);
    }

    return (await resp.json()) as DeepLXResponse;
  }
}

/**
 * @example deepLXTranslator.translate({sourceLang:"auto",targetLang:"ZH",text:"Hello world"})
 */
export const deepLXTranslator = new DeepLXTranslator();
