function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findYamlLocationForJsonPointer(yamlText, pointer) {
  if (!pointer) return null;
  const lastSegment = pointer.split("/").filter(Boolean).pop();
  if (!lastSegment) return null;

  const refPattern = new RegExp(`\\$ref:\\s*['"]?#${pointer}['"]?`, "m");
  const match = yamlText.match(refPattern);
  if (match) return match.index;

  const defPattern = new RegExp(`^\\s*${escapeRegExp(lastSegment)}:\\s*$`, "m");
  const m2 = yamlText.match(defPattern);
  if (m2) return m2.index;

  return null;
}

export function getMarkersFromValidationResult(validationResult, yamlText, model, monaco) {
  const markers = [];

  for (const e of [
    ...(validationResult.errors || []),
    ...(validationResult.warnings || []),
  ]) {
    const pointer = e.path || e.pointer || e.ref || null;

    let startIndex = null;
    if (pointer && typeof pointer === "string" && pointer.startsWith("/")) {
      startIndex = findYamlLocationForJsonPointer(yamlText, pointer);
    } else if (e.ref && typeof e.ref === "string" && e.ref.startsWith("#/")) {
      startIndex = findYamlLocationForJsonPointer(yamlText, e.ref.substring(1));
    } else {
      const tokenMatch = yamlText.indexOf(
        e.ref && typeof e.ref === "string"
          ? e.ref
          : String(e.message || "").split(/\s+/).slice(0, 5).join(" "),
      );
      startIndex = tokenMatch >= 0 ? tokenMatch : null;
    }

    const severity =
      e.severity === "warning"
        ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Error;

    if (startIndex !== null && startIndex >= 0) {
      const startPos = model.getPositionAt(startIndex);
      const endPos = model.getPositionAt(startIndex + 1 + (e.ref ? String(e.ref).length : 1));
      markers.push({
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
        message: e.message,
        severity,
      });
    } else {
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