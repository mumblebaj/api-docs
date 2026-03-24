export function parseXmlWithDiagnostics(text, target = "xml") {
  const diagnostics = [];

  if (!text.trim()) {
    diagnostics.push(makeDiagnostic(target, "error", `${target.toUpperCase()} is empty.`, 1, 1));
    return {
      diagnostics,
      document: null
    };
  }

  let doc;

  try {
    doc = new DOMParser().parseFromString(text, "application/xml");
  } catch (error) {
    diagnostics.push(
      makeDiagnostic(
        target,
        "error",
        error?.message || `Failed to parse ${target.toUpperCase()}.`,
        1,
        1
      )
    );

    return {
      diagnostics,
      document: null
    };
  }

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    const message = normalizeParserError(parserError.textContent || parserError.innerText || "");
    const { line, column } = extractLineColumn(message);

    diagnostics.push(
      makeDiagnostic(
        target,
        "error",
        message || `${target.toUpperCase()} is not well-formed XML.`,
        line,
        column
      )
    );

    return {
      diagnostics,
      document: null
    };
  }

  return {
    diagnostics,
    document: doc
  };
}

export function makeDiagnostic(target, severity, message, line = 1, column = 1) {
  return {
    target,
    severity,
    message,
    line: Number.isFinite(line) ? line : 1,
    column: Number.isFinite(column) ? column : 1
  };
}

function normalizeParserError(raw) {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^This page contains the following errors:\s*/i, "")
    .replace(/\s*Below is a rendering of the page up to the first error\.\s*/i, "")
    .trim();
}

function extractLineColumn(message) {
  const patterns = [
    /line\s+(\d+)\s+at\s+column\s+(\d+)/i,
    /at\s+line\s+(\d+)\s+column\s+(\d+)/i,
    /Line Number\s+(\d+),\s*Column\s+(\d+)/i,
    /line\s+(\d+),\s*column\s+(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        line: parseInt(match[1], 10) || 1,
        column: parseInt(match[2], 10) || 1
      };
    }
  }

  return { line: 1, column: 1 };
}