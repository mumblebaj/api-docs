export function clearAllMarkers(editors) {
  const monaco = editors.monaco;
  monaco.editor.setModelMarkers(editors.xsd.getModel(), "xsd", []);
  monaco.editor.setModelMarkers(editors.xml.getModel(), "xml", []);
}

export function mapDiagnosticsToMarkers(editors, diagnostics) {
  const monaco = editors.monaco;

  const xsdMarkers = diagnostics
    .filter((d) => d.target === "xsd")
    .map((d) => toMarker(monaco, d));

  const xmlMarkers = diagnostics
    .filter((d) => d.target === "xml")
    .map((d) => toMarker(monaco, d));

  monaco.editor.setModelMarkers(editors.xsd.getModel(), "xsd", xsdMarkers);
  monaco.editor.setModelMarkers(editors.xml.getModel(), "xml", xmlMarkers);
}

function toMarker(monaco, diagnostic) {
  const line = normalizePositiveInt(diagnostic.line, 1);
  const column = normalizePositiveInt(diagnostic.column, 1);

  return {
    startLineNumber: line,
    startColumn: column,
    endLineNumber: line,
    endColumn: Math.max(column + 1, column),
    message: diagnostic.message,
    severity:
      diagnostic.severity === "warning"
        ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Error
  };
}

function normalizePositiveInt(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
}