import { parseXmlWithDiagnostics } from "../validation/xmlDiagnostics.js";

export function formatXsd(xsd) {
  const { document, diagnostics } = parseXmlWithDiagnostics(xsd, "xsd");

  if (!document) {
    const error = diagnostics[0]?.message || "XSD could not be formatted because it is invalid.";
    throw new Error(error);
  }

  return serializePretty(document);
}

function serializePretty(document) {
  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(document);

  const PADDING = "  ";
  const reg = /(>)(<)(\/*)/g;
  const xml = raw.replace(reg, "$1\n$2$3");

  let formatted = "";
  let indent = 0;

  for (const line of xml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isClosingTag(trimmed)) {
      indent = Math.max(indent - 1, 0);
    }

    formatted += `${PADDING.repeat(indent)}${trimmed}\n`;

    if (shouldIncreaseIndent(trimmed)) {
      indent += 1;
    }
  }

  return formatted.trim();
}

function isClosingTag(line) {
  return /^<\/.+>$/.test(line);
}

function shouldIncreaseIndent(line) {
  if (/^<\?xml/.test(line)) return false;
  if (/^<!--/.test(line)) return false;
  if (/^<[^!?/][^>]*[^/]>$/.test(line) && !containsInlineClose(line)) return true;
  return false;
}

function containsInlineClose(line) {
  return /^<([^\s>]+)([^>]*)>.*<\/\1>$/.test(line);
}