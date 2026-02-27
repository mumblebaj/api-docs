export function collectAllRefs(obj, out = []) {
  if (!obj || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    for (const v of obj) collectAllRefs(v, out);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === "$ref" && typeof v === "string") out.push(v);
    else if (typeof v === "object") collectAllRefs(v, out);
  }
  return out;
}

export function collectExternalRefs(spec) {
  const all = collectAllRefs(spec);
  return all.filter((r) => !r.startsWith("#/"));
}

export function resolveJsonPointer(root, pointer) {
  if (!pointer) return root;
  if (pointer[0] !== "/") throw new Error("Pointer must start with '/'");

  const parts = pointer
    .split("/")
    .slice(1)
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));

  let node = root;
  for (const key of parts) {
    if (node && typeof node === "object" && key in node) node = node[key];
    else return undefined;
  }
  return node;
}

export function collectUnresolvedInternalRefs(spec) {
  const all = collectAllRefs(spec).filter((r) => r.startsWith("#/"));
  const unresolved = [];
  for (const ref of all) {
    try {
      const node = resolveJsonPointer(spec, ref.substring(1));
      if (typeof node === "undefined") unresolved.push(ref);
    } catch {
      unresolved.push(ref);
    }
  }
  return unresolved;
}