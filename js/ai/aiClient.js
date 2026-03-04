import { AI } from "./aiConfig.js?v=20260304T153052Z";

const TIMEOUT_MS = 25000;

export class AiAuthError extends Error {
  constructor(message = "Sign-in required", meta = {}) {
    super(message);
    this.name = "AiAuthError";
    this.isCorporate = !!meta.isCorporate;
    this.status = meta.status || 401;
  }
}

export async function draftOpenApi({
  prompt,
  mode = "newDoc",
  currentYaml = "",
}) {
  const endpoint = AI.getEndpoint();

  const url = new URL(endpoint, window.location.href);
  const sameOrigin = url.origin === window.location.origin;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: sameOrigin ? "include" : "omit",
      body: JSON.stringify({ prompt, mode, currentYaml }),
      signal: controller.signal,
      redirect: "manual", // ✅ prevent following Access login redirect (which triggers CORS)
    });
    // If not signed in, Cloudflare Access returns a redirect to its login domain.
    // With redirect:"manual" the browser returns an opaque redirect instead of following it.
    if (sameOrigin && res.type === "opaqueredirect") {
      throw new AiAuthError("Sign-in required", {
        isCorporate: false,
        status: 401,
      });
    }
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(
        `AI request timed out after ${Math.round(TIMEOUT_MS / 1000)}s. Please try again.`,
      );
    }
    if (err instanceof TypeError) {
      // Browser blocked the response (CORS/network/auth redirect edge cases)
      throw new AiAuthError("Sign-in required", {
        isCorporate: !sameOrigin,
        status: 0,
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 || res.status === 403) {
    throw new AiAuthError("Sign-in required", {
      isCorporate: !sameOrigin,
      status: res.status,
    });
  }

  if (!res.ok) {
    const msg = data?.error || res.statusText || "AI request failed";
    const details = data?.details ? `\n${data.details}` : "";
    throw new Error(`${msg}${details}`);
  }

  if (typeof data?.yaml !== "string" || !data.yaml.trim()) {
    throw new Error("AI returned empty YAML.");
  }

  return { yaml: data.yaml };
}
