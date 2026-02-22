// js/ai/aiClient.js
// No API keys in browser. If a corporate gateway needs auth, they can enforce it via SSO/cookies or their own gateway rules.
import { AI } from "./aiConfig.js?v=20260218T160835Z";

export async function draftOpenApi({ prompt, mode = "newDoc", currentYaml = "" }) {
  const endpoint = AI.getEndpoint();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // credentials included so Cloudflare Access / SSO cookies work
    credentials: "include",
    body: JSON.stringify({ prompt, mode, currentYaml }),
  });

  const data = await res.json().catch(() => ({}));
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