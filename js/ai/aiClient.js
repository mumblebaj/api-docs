import { AI } from "./aiConfig.js?v=20260225T151357Z";

const TIMEOUT_MS = 25000;

export class AiAuthError extends Error {
  constructor(message = "Sign-in required", meta = {}) {
    super(message);
    this.name = "AiAuthError";
    this.isCorporate = !!meta.isCorporate;
    this.status = meta.status || 401;
  }
}

export async function draftOpenApi({ prompt, mode = "newDoc", currentYaml = "" }) {
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
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`AI request timed out after ${Math.round(TIMEOUT_MS / 1000)}s. Please try again.`);
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