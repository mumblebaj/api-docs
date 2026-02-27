export async function fetchJsonWithFallbacks(candidates) {
  let lastErr = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      lastErr = new Error(`Failed to fetch ${url}: ${err.message || err}`);
    }
  }

  throw lastErr || new Error("Failed to fetch JSON from all candidates");
}