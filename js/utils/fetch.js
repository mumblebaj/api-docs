export async function fetchJsonWithFallbacks(candidates) {
  let lastErr = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const ct = (res.headers.get("content-type") || "").toLowerCase();

      // If it's JSON, parse normally
      if (ct.includes("application/json") || ct.includes("+json")) {
        return await res.json();
      }

      // Otherwise parse as text and try to extract JSON from HTML/text
      const text = await res.text();

      // Heuristic: find first '{' and last '}' and parse the substring.
      // Works for spec.openapis.org pages that embed a single JSON object.
      const first = text.indexOf("{");
      const last = text.lastIndexOf("}");
      if (first >= 0 && last > first) {
        const jsonText = text.slice(first, last + 1);
        return JSON.parse(jsonText);
      }

      throw new Error(`Response was not JSON and contained no JSON object (content-type: ${ct})`);
    } catch (err) {
      lastErr = new Error(`Failed to fetch ${url}: ${err.message || err}`);
    }
  }

  throw lastErr || new Error("Failed to fetch JSON from all candidates");
}