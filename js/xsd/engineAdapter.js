function getEngine() {
  const engine =
    window.UssXsdEngine || window.ussXsdEngine || window.USSXsdEngine || null;

  if (!engine) {
    throw new Error(
      "uss-xsd-engine is not loaded. Make sure the standalone CDN script is included before xsdStudio.js.",
    );
  }

  return engine;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getLine(value) {
  return (
    Number(value?.line) ||
    Number(value?.lineNumber) ||
    Number(value?.row) ||
    Number(value?.startLine) ||
    Number(value?.location?.line) ||
    Number(value?.loc?.line) ||
    Number(value?.position?.line) ||
    Number(value?.range?.startLine) ||
    Number(value?.start?.line) ||
    Number(value?.data?.line) ||
    Number(value?.data?.lineNumber) ||
    Number(value?.data?.location?.line) ||
    Number(value?.data?.range?.startLine) ||
    1
  );
}

function getColumn(value) {
  return (
    Number(value?.column) ||
    Number(value?.col) ||
    Number(value?.columnNumber) ||
    Number(value?.startColumn) ||
    Number(value?.location?.column) ||
    Number(value?.loc?.column) ||
    Number(value?.position?.column) ||
    Number(value?.range?.startColumn) ||
    Number(value?.start?.column) ||
    Number(value?.data?.column) ||
    Number(value?.data?.columnNumber) ||
    Number(value?.data?.location?.column) ||
    Number(value?.data?.range?.startColumn) ||
    1
  );
}

function normalizeSeverity(value, fallback = "error") {
  const v = String(value || fallback).toLowerCase();
  if (v === "warning" || v === "warn") return "warning";
  return "error";
}

function normalizeTarget(value, fallback = "xsd") {
  const v = String(value || fallback).toLowerCase();
  if (v === "xml") return "xml";
  return fallback;
}

function normalizeDiagnostic(
  item,
  fallbackTarget = "xsd",
  fallbackSeverity = "error",
) {
  return {
    target: normalizeTarget(item?.target || item?.data?.target, fallbackTarget),
    severity: normalizeSeverity(
      item?.severity || item?.level || item?.data?.severity,
      fallbackSeverity,
    ),
    message:
      item?.message ||
      item?.text ||
      item?.detail ||
      item?.reason ||
      item?.description ||
      item?.data?.message ||
      item?.data?.detail ||
      "Unknown issue",
    line: getLine(item),
    column: getColumn(item),
  };
}

function collectDiagnostics(result, fallbackTarget = "xsd") {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result.map((item) => normalizeDiagnostic(item, fallbackTarget));
  }

  const diagnostics = [];
  const rawDiagnostics = toArray(result.diagnostics);
  const rawIssues = toArray(result.issues);
  const rawMessages = toArray(result.messages);
  const rawErrors = toArray(result.errors);
  const rawWarnings = toArray(result.warnings);

  diagnostics.push(
    ...rawDiagnostics.map((item) => normalizeDiagnostic(item, fallbackTarget)),
    ...rawIssues.map((item) => normalizeDiagnostic(item, fallbackTarget)),
    ...rawMessages.map((item) => normalizeDiagnostic(item, fallbackTarget)),
    ...rawErrors.map((item) =>
      normalizeDiagnostic(item, fallbackTarget, "error"),
    ),
    ...rawWarnings.map((item) =>
      normalizeDiagnostic(item, fallbackTarget, "warning"),
    ),
  );

  if (!diagnostics.length && result.ok === false && result.message) {
    diagnostics.push(
      normalizeDiagnostic(
        {
          message: result.message,
          line: result.line,
          column: result.column,
          location: result.location,
          range: result.range,
          data: result.data,
        },
        fallbackTarget,
        "error",
      ),
    );
  }

  return diagnostics;
}

function extractTreeFromResult(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];

  if (Array.isArray(result.tree)) return result.tree;
  if (Array.isArray(result.nodes)) return result.nodes;
  if (Array.isArray(result.schemaTree)) return result.schemaTree;
  if (Array.isArray(result.result)) return result.result;
  if (Array.isArray(result.data)) return result.data;

  if (Array.isArray(result.data?.tree)) return result.data.tree;
  if (Array.isArray(result.data?.nodes)) return result.data.nodes;
  if (Array.isArray(result.data?.schemaTree)) return result.data.schemaTree;
  if (Array.isArray(result.data?.result)) return result.data.result;
  if (Array.isArray(result.data?.roots)) return result.data.roots;
  if (Array.isArray(result.data?.items)) return result.data.items;

  return [];
}

function normalizeTreeNode(node) {
  if (!node || typeof node !== "object") {
    return null;
  }

  const children = toArray(
    node.children || node.items || node.nodes || node.data?.children,
  )
    .map(normalizeTreeNode)
    .filter(Boolean);

  return {
    kind: node.kind || node.type || node.nodeKind || node.data?.kind || "node",
    label:
      node.label ||
      node.name ||
      node.title ||
      node.displayName ||
      node.data?.label ||
      node.data?.name ||
      node.kind ||
      "node",
    line: getLine(node),
    column: getColumn(node),
    children,
  };
}

function normalizeTree(tree) {
  return toArray(tree).map(normalizeTreeNode).filter(Boolean);
}

function extractXmlFromResult(result) {
  if (typeof result === "string") {
    return result;
  }

  if (!result || typeof result !== "object") {
    return "";
  }

  if (typeof result.xml === "string") return result.xml;
  if (typeof result.xmlText === "string") return result.xmlText;
  if (typeof result.sampleXml === "string") return result.sampleXml;
  if (typeof result.output === "string") return result.output;
  if (typeof result.value === "string") return result.value;
  if (typeof result.result === "string") return result.result;
  if (typeof result.data === "string") return result.data;

  if (typeof result.data?.xml === "string") return result.data.xml;
  if (typeof result.data?.xmlText === "string") return result.data.xmlText;
  if (typeof result.data?.sampleXml === "string") return result.data.sampleXml;
  if (typeof result.data?.output === "string") return result.data.output;
  if (typeof result.data?.value === "string") return result.data.value;
  if (typeof result.data?.result === "string") return result.data.result;

  return "";
}

function callEngine(methodName, objectArgs, positionalArgs = []) {
  const engine = getEngine();
  const fn = engine?.[methodName];

  if (typeof fn !== "function") {
    throw new Error(`uss-xsd-engine method "${methodName}" is not available.`);
  }

  const attempts = [() => fn(objectArgs), () => fn(...positionalArgs)];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "");
      const looksLikeArgShapeProblem =
        message.includes("must be a non-empty string") ||
        message.includes("required") ||
        message.includes("expected");

      if (!looksLikeArgShapeProblem) {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    new Error(`Failed to call uss-xsd-engine method "${methodName}".`)
  );
}

export function runXsdDiagnostics(xsdText) {
  const result = callEngine("getSchemaDiagnostics", { xsdText }, [xsdText]);
  
  return collectDiagnostics(result, "xsd");
}

export function runExtractTree(xsdText) {
  const result = callEngine("extractSchemaTree", { xsdText }, [xsdText]);
  
  return normalizeTree(extractTreeFromResult(result));
}

export function runGenerateXml(xsdText, options = {}) {
  const result = callEngine("generateSampleXml", { xsdText, options }, [
    xsdText,
    options,
  ]);

  const xml = extractXmlFromResult(result);
  if (xml) {
    return xml;
  }

  const diagnostics = collectDiagnostics(result, "xsd");
  if (diagnostics.length) {
    throw new Error(diagnostics[0].message);
  }

  throw new Error("Engine did not return XML output.");
}

export function runValidateXml(xsdText, xmlText) {
  const result = callEngine("validateXml", { xsdText, xmlText }, [
    xsdText,
    xmlText,
  ]);

  return collectDiagnostics(result, "xml");
}
