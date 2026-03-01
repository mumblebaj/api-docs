function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeJsonPointerToken(token) {
  // JSON Pointer decoding: ~1 => /, ~0 => ~
  // Also handle URI encoding when present (safe try/catch).
  const t = String(token).replace(/~1/g, "/").replace(/~0/g, "~");
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function findYamlLocationForJsonPointer(yamlText, pointer) {
  if (!pointer || typeof pointer !== "string") return null;

  // Pointer like /paths/~1pets/get/.../nullable
  const segments = pointer.split("/").filter(Boolean).map(decodeJsonPointerToken);
  if (!segments.length) return null;

  const lastSegment = segments[segments.length - 1];

  // 1) If this pointer is referenced via $ref, try to locate it directly
  // (use original pointer because $ref is typically "#/..")
  const refPattern = new RegExp(`\\$ref:\\s*['"]?#${escapeRegExp(pointer)}['"]?`, "m");
  const match = yamlText.match(refPattern);
  if (match) return match.index;

  // 2) Look for the last segment as a YAML key (works for "nullable: true", etc.)
  // Match: optional whitespace, key, optional whitespace, colon
  const keyPattern = new RegExp(
    `^\\s*${escapeRegExp(String(lastSegment))}\\s*:`,
    "m",
  );
  const m2 = yamlText.match(keyPattern);
  if (m2) return m2.index;

  // 3) Fallback: search for "key:" anywhere (not anchored)
  const looseKeyPattern = new RegExp(
    `${escapeRegExp(String(lastSegment))}\\s*:`,
    "m",
  );
  const m3 = yamlText.match(looseKeyPattern);
  if (m3) return m3.index;

  return null;
}

export function getMarkersFromValidationResult(validationResult, yamlText, model, monaco) {
  const markers = [];

  for (const e of [
    ...(validationResult.errors || []),
    ...(validationResult.warnings || []),
  ]) {
    const pointer = e.path || e.pointer || (typeof e.ref === "string" && e.ref.startsWith("#/") ? e.ref.substring(1) : null);

    let startIndex = null;

    if (pointer && typeof pointer === "string" && pointer.startsWith("/")) {
      startIndex = findYamlLocationForJsonPointer(yamlText, pointer);
    } else {
      // Last resort token search
      const token = e.ref && typeof e.ref === "string"
        ? e.ref
        : String(e.message || "").split(/\s+/).slice(0, 5).join(" ");
      const tokenMatch = yamlText.indexOf(token);
      startIndex = tokenMatch >= 0 ? tokenMatch : null;
    }

    // Severity mapping: error / warning / info
    const severity =
      e.severity === "error"
        ? monaco.MarkerSeverity.Error
        : e.severity === "warning"
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info;

    if (startIndex !== null && startIndex >= 0) {
      const startPos = model.getPositionAt(startIndex);

      // Make highlight span a bit more than 1 char (prefer pointer length)
      const tokenLen =
        (pointer && typeof pointer === "string" ? pointer.length : 0) ||
        (e.ref ? String(e.ref).length : 1) ||
        1;

      const endPos = model.getPositionAt(startIndex + 1 + tokenLen);

      markers.push({
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
        message: e.message,
        severity,
      });
    } else {
      // Fallback to top of file if we cannot locate anything
      markers.push({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        message: e.message,
        severity,
      });
    }
  }

  return markers;
}