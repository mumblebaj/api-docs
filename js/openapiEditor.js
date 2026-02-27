// openapiEditor.js — Created by mumblebaj

import { buildDocModel } from "./exporter/docModel.js?v=20260227T151016Z";
import { filterDocModelForSchemas } from "./exporter/docModel.js?v=20260227T151016Z";
import { exportMarkdown } from "./exporter/exportMarkdown.js?v=20260227T151016Z";
import { downloadMarkdownFile } from "./exporter/downloadUtils.js?v=20260227T151016Z";
import { exportConfluence } from "./exporter/exportConfluence.js?v=20260227T151016Z";
import { showToast } from "./ui/toast.js?v=20260227T151016Z";
import { initExportDropdown } from "./ui/dropdown.js?v=20260227T151016Z";
import {
  createSelectionState,
  applyUserSelection,
  applyUserDeselection,
  getFinalSelection,
  getDependencyCount,
} from "./schemaExport/selectionUtils.js?v=20260227T151016Z";
import { buildSchemaDependencyMap } from "./schemaExport/dependencyResolver.js?v=20260227T151016Z";
import { initSchemaExportModal } from "./schemaExport/schemaExportModal.js";
// AI Imports
import { bindEditor } from "./editor/editorApi.js?v=20260227T151016Z";
import { initAiPanel } from "./ai/aiPanel.js?v=20260227T151016Z";
import { initAiToggle } from "./ai/aiToggle.js?v=20260227T151016Z";

// ensure a YAML global exists even if the library exports jsyaml
window.YAML = window.YAML || window.jsyaml || {};
if (
  typeof window.YAML.parse !== "function" &&
  typeof window.YAML.load === "function"
) {
  window.YAML.parse = window.YAML.load;
  window.YAML.stringify = window.YAML.dump;
}

const oldError = console.error;
console.error = function (...args) {
  if (typeof args[0] === "string" && args[0].includes("Check dependency list!"))
    return;
  oldError.apply(console, args);
};

import defaultYamlTemplate from "./template.js?v=20260227T151016Z";

// Debounce helper (async-safe + immediate feedback)
function debounce(fn, delay = 1200, statusEl) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    const [yamlText] = args;
    statusEl.textContent = "⏳ Validating...";
    statusEl.style.color = "#ffb400";
    timer = setTimeout(async () => {
      try {
        await fn(...args);
      } catch (err) {
        console.error("Debounced function error:", err);
      }
    }, delay);
  };
}

// ------------------------------
// OpenAPI validation helpers
// ------------------------------
let __swaggerParser = null;

async function getSwaggerParser() {
  if (__swaggerParser) return __swaggerParser;
  // Real OpenAPI validator (schema + spec checks)
  const mod =
    await import("https://esm.sh/@apidevtools/swagger-parser@12.1.0?target=es2022");
  __swaggerParser = mod.default;
  return __swaggerParser;
}

// Collect security scheme names referenced by root + operations
function collectSecuritySchemeRefs(spec) {
  const refs = new Set();

  function addSecurityReqArray(security) {
    if (!Array.isArray(security)) return;
    for (const req of security) {
      if (req && typeof req === "object") {
        for (const schemeName of Object.keys(req)) refs.add(schemeName);
      }
    }
  }

  addSecurityReqArray(spec?.security);

  const paths = spec?.paths || {};
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const op of Object.values(pathItem)) {
      if (!op || typeof op !== "object") continue;
      addSecurityReqArray(op.security);
    }
  }

  return [...refs];
}

// Semantic check: referenced schemes must exist in components.securitySchemes
function assertSecuritySchemesDefined(spec) {
  const defined = new Set(Object.keys(spec?.components?.securitySchemes || {}));
  const referenced = collectSecuritySchemeRefs(spec);

  const missing = referenced.filter((name) => !defined.has(name));
  if (missing.length) {
    throw new Error(
      `Undefined security scheme(s) referenced: ${missing.join(", ")}. ` +
        `Define them under components.securitySchemes (OpenAPI 3.0.3).`,
    );
  }
}

// Semantic check: servers[].variables must be a map of variableName -> { default, enum?, ... }
function assertServerVariablesShape(spec) {
  const servers = Array.isArray(spec?.servers) ? spec.servers : [];
  servers.forEach((srv, i) => {
    if (!srv || typeof srv !== "object") return;
    if (!srv.variables) return;
    if (typeof srv.variables !== "object" || Array.isArray(srv.variables)) {
      throw new Error(`servers[${i}].variables must be an object/map.`);
    }

    for (const [varName, varObj] of Object.entries(srv.variables)) {
      if (!varObj || typeof varObj !== "object" || Array.isArray(varObj)) {
        throw new Error(
          `servers[${i}].variables.${varName} must be an object with at least a 'default' field.`,
        );
      }
      if (!("default" in varObj)) {
        throw new Error(
          `servers[${i}].variables.${varName} is missing required field 'default'.`,
        );
      }
      if ("enum" in varObj && !Array.isArray(varObj.enum)) {
        throw new Error(
          `servers[${i}].variables.${varName}.enum must be an array if provided.`,
        );
      }
    }
  });
}

async function fetchJsonWithFallbacks(candidates) {
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

let __ajvValidate = null;

async function getAjvValidate() {
  if (__ajvValidate) return __ajvValidate;

  // Ajv v6 (Draft-04 friendly)
  const AjvMod = await import("https://esm.sh/ajv@6.12.6?bundle&target=es2022");
  const Ajv = AjvMod.default ?? AjvMod;

  const SchemasMod =
    await import("https://esm.sh/@apidevtools/openapi-schemas@2.1.0?bundle&target=es2022");

  const schemas = SchemasMod.default ?? SchemasMod;

  const oas30 =
    schemas.openapiV3 ??
    schemas.openapiV30 ??
    schemas["openapiV3"] ??
    schemas["openapiV30"];

  if (!oas30) {
    console.error("openapi-schemas module shape:", SchemasMod);
    throw new Error("Could not load OpenAPI 3.0 schema from openapi-schemas.");
  }

  const ajv = new Ajv({
    allErrors: true,
    schemaId: "auto", // important for draft-04 style $schema IDs
    jsonPointers: true,
    // strictKeywords doesn't exist in v6; v6 is looser by default
  });

  const draft4Meta = await fetchJsonWithFallbacks([
    "/vendor/ajv/json-schema-draft-04.json", // custom domain deployment
    "/api-docs/vendor/ajv/json-schema-draft-04.json", // GitHub Pages deployment
  ]);
  // ajv.addMetaSchema(draft4Meta);

  // const draft4Meta = await fetch("/api-docs/vendor/ajv/json-schema-draft-04.json").then(
  //   (r) => r.json(),
  // );
  ajv.addMetaSchema(draft4Meta);

  __ajvValidate = ajv.compile(oas30);
  return __ajvValidate;
}

async function validateOpenApiSpec(spec, options = {}) {
  const { strict = false, offline = true } = options;
  const result = { errors: [], warnings: [] };

  // 1) Schema validation via AJV
  try {
    const validate = await getAjvValidate();
    const ok = validate(spec);

    if (!ok && validate.errors?.length) {
      for (const e of validate.errors) {
        result.errors.push({
          code: e.keyword || "AJV_ERROR",
          message: e.message || "Schema validation error",
          path: e.instancePath || "/", // JSON pointer-ish
          details: e,
        });
      }
    }
  } catch (err) {
    result.errors.push({
      code: "SCHEMA_VALIDATOR_FAILED",
      message: err.message || String(err),
    });
  }

  // 2) USS semantic checks
  try {
    assertSecuritySchemesDefined(spec);
  } catch (err) {
    result.errors.push({
      code: "MISSING_SECURITY_SCHEMES",
      message: err.message,
      path: "/security",
    });
  }

  try {
    assertServerVariablesShape(spec);
  } catch (err) {
    result.errors.push({
      code: "INVALID_SERVER_VARIABLES",
      message: err.message,
      path: "/servers",
    });
  }

  // 3) Unresolved internal refs
  const unresolvedInternal = collectUnresolvedInternalRefs(spec);
  for (const ref of unresolvedInternal) {
    result.errors.push({
      code: "UNRESOLVED_INTERNAL_REF",
      message: `Unresolved internal $ref: ${ref}`,
      ref,
      path: "/", // best-effort; your marker resolver will locate via $ref string
    });
  }

  // 4) External ref policy: warn (offline) or warn about potential fetch/CORS
  const externalRefs = collectExternalRefs(spec);
  if (externalRefs.length) {
    result.warnings.push({
      code: offline ? "EXTERNAL_REFS_OFFLINE" : "EXTERNAL_REFS",
      severity: "warning",
      message: offline
        ? `External $ref(s) present: ${externalRefs.join(", ")} — offline mode: not fetched.`
        : `External $ref(s) present: ${externalRefs.join(", ")}. Browser fetch may fail due to CORS.`,
      refs: externalRefs,
    });
  }

  if (strict && result.errors.length) {
    const agg = new Error(
      `[OpenAPI validation failed] ${result.errors.length} error(s).`,
    );
    agg.validationResult = result;
    throw agg;
  }

  return result;
}

function normalizeSwaggerParserError(err) {
  const out = [];

  // If error came from AJV, it may have `errors` array
  if (err && Array.isArray(err.errors) && err.errors.length) {
    for (const e of err.errors) {
      out.push({
        code: e.keyword || "AJV_ERROR",
        message: e.message || JSON.stringify(e),
        // AJV v8 uses instancePath (JSON Pointer like) or dataPath on older versions
        path: e.instancePath || e.dataPath || null,
        details: e,
      });
    }
    return out;
  }

  // json-schema-ref-parser errors have message and path
  if (err && typeof err === "object") {
    // Some deref errors: err.message will contain useful info like "Error resolving $ref ..."
    out.push({
      code: err.code || "SWAGGER_PARSER_ERROR",
      message: err.message || String(err),
      path: err.path || err.details?.path || null,
      details: err,
    });
    return out;
  }

  // Fallback
  out.push({
    code: "UNKNOWN_VALIDATION_ERROR",
    message: err && err.message ? err.message : String(err),
    details: err,
  });
  return out;
}

// Recursively collect all $ref values (string) in the spec
function collectAllRefs(obj, out = []) {
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

function collectExternalRefs(spec) {
  const all = collectAllRefs(spec);
  return all.filter((r) => !r.startsWith("#/"));
}

function collectUnresolvedInternalRefs(spec) {
  const all = collectAllRefs(spec).filter((r) => r.startsWith("#/"));
  const unresolved = [];
  for (const ref of all) {
    // use resolveJsonPointer to test existence
    try {
      const node = resolveJsonPointer(spec, ref.substring(1)); // remove leading '#'
      if (typeof node === "undefined") unresolved.push(ref);
    } catch (e) {
      unresolved.push(ref);
    }
  }
  return unresolved;
}

// Resolve a JSON Pointer (RFC 6901) against an object. pointer begins with /...
function resolveJsonPointer(root, pointer) {
  if (!pointer) return root; // empty pointer => whole document
  if (pointer[0] !== "/") {
    throw new Error("Pointer must start with '/'");
  }
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

// yamlText = editor.getValue(), pointer = '/components/schemas/MyType' or null
function findYamlLocationForJsonPointer(yamlText, pointer) {
  // prefer: look for the tail token (last path segment) as `$ref: '#/components/schemas/MyType'`
  if (!pointer) return null;
  const lastSegment = pointer.split("/").filter(Boolean).pop();
  if (!lastSegment) return null;

  // Look for $ref pointing to that segment first
  const refPattern = new RegExp(`\\$ref:\\s*['"]?#${pointer}['"]?`, "m");
  const match = yamlText.match(refPattern);
  if (match) {
    const startIndex = match.index;
    return startIndex;
  }

  // Fallback: find the component definition itself 'MyType:' under components
  // This is more error-prone but often works
  const defPattern = new RegExp(`^\\s*${escapeRegExp(lastSegment)}:\\s*$`, "m");
  const m2 = yamlText.match(defPattern);
  if (m2) return m2.index;

  return null;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMarkersFromValidationResult(validationResult, yamlText, model) {
  const markers = [];

  for (const e of [
    ...(validationResult.errors || []),
    ...(validationResult.warnings || []),
  ]) {
    // Prefer pointer/path if present
    const pointer = e.path || e.pointer || e.ref || null;

    let startIndex = null;
    if (pointer && pointer.startsWith("/")) {
      startIndex = findYamlLocationForJsonPointer(yamlText, pointer);
    } else if (e.ref && typeof e.ref === "string" && e.ref.startsWith("#/")) {
      startIndex = findYamlLocationForJsonPointer(yamlText, e.ref.substring(1));
    } else {
      // fallback: search for key-like token in the YAML text (component name, message fragment)
      const tokenMatch = yamlText.indexOf(
        e.ref && typeof e.ref === "string"
          ? e.ref
          : e.message.split(/\s+/).slice(0, 5).join(" "),
      );
      startIndex = tokenMatch >= 0 ? tokenMatch : null;
    }

    if (startIndex !== null && startIndex >= 0) {
      const startPos = model.getPositionAt(startIndex);
      const endPos = model.getPositionAt(
        startIndex + 1 + (e.ref ? e.ref.length : 1),
      );
      markers.push({
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
        message: e.message,
        severity:
          e.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Error,
      });
    } else {
      // top-level fallback: attach to line 1 so user sees it
      markers.push({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
        message: e.message,
        severity:
          e.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Error,
      });
    }
  }

  return markers;
}

// Guarded Monaco loader
if (!window.__monacoAlreadyLoaded) {
  window.__monacoAlreadyLoaded = true;
  window.require.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs" },
  });
  window.require(["vs/editor/editor.main"], initMonaco);
}

// =======================================================
// 🧩 Monaco Theme Initialization + Dropdown Control
// =======================================================

const monacoThemes = {
  vs: "Visual Studio (Light)",
  "vs-dark": "Visual Studio Dark",
  "hc-black": "High Contrast Dark",
};

// Determine initial theme (localStorage > system > default)
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentTheme =
  localStorage.getItem("editorTheme") || (prefersDark ? "hc-black" : "vs");

// Load Monaco with chosen theme
require(["vs/editor/editor.main"], () => {
  monaco.editor.setTheme(currentTheme);
});

// Dropdown setup after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  const themeSelect = document.getElementById("themeSelect");
  if (!themeSelect) return;

  // set dropdown to current value
  themeSelect.value = currentTheme;

  // handle change
  themeSelect.addEventListener("change", (e) => {
    const selected = e.target.value;
    currentTheme = selected;
    monaco.editor.setTheme(currentTheme);
    localStorage.setItem("editorTheme", currentTheme);

    // optional: set a data-theme on body for styling (future)
    document.body.dataset.theme = currentTheme === "vs" ? "light" : "dark";
  });
});

function applyEditorContainerTheme() {
  const yamlEditor = document.getElementById("yamlEditor");
  if (!yamlEditor) return;

  switch (currentTheme) {
    case "vs":
      yamlEditor.style.backgroundColor = "#ffffff"; // bright white
      break;
    case "vs-dark":
      yamlEditor.style.backgroundColor = "#1e1e1e"; // standard dark gray
      break;
    case "hc-black":
      yamlEditor.style.backgroundColor = "#000000"; // true black
      break;
  }
}

// Run on load
window.addEventListener("DOMContentLoaded", applyEditorContainerTheme);

// Run whenever theme changes
document
  .getElementById("themeSelect")
  ?.addEventListener("change", applyEditorContainerTheme);

// Inititialize Monaco
function initMonaco() {
  const editor = monaco.editor.create(document.getElementById("yamlEditor"), {
    value:
      defaultYamlTemplate ||
      `openapi: 3.0.2\ninfo:\n  title: Add title here\n  version: 1.0.0`,
    language: "yaml",
    theme: currentTheme,
    automaticLayout: true,
  });

  bindEditor(editor);
  initAiPanel();
  initAiToggle();

  const statusEl = document.getElementById("status");
  const model = editor.getModel();

  // --- 🧩 $ref link provider for Monaco ---
  monaco.languages.registerLinkProvider("yaml", {
    provideLinks(model) {
      const text = model.getValue();
      const links = [];
      const refRegex = /\$ref:\s*['"]?#\/components\/[^\s'"]+['"]?/g;

      for (const match of text.matchAll(refRegex)) {
        const startIndex = match.index + 6;
        const endIndex = startIndex + match[0].length - 6;
        const startPos = model.getPositionAt(startIndex);
        const endPos = model.getPositionAt(endIndex);
        const refPath = match[0].match(/#\/components\/[^\s'"]+/)?.[0];
        if (refPath) {
          links.push({
            range: new monaco.Range(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column,
            ),
            url: `ref://${refPath}`,
          });
        }
      }
      return { links };
    },
  });

  // --- 🧩 Handle Ctrl+Click on $ref lines ---
  editor.onMouseDown((e) => {
    if (!(e.event.ctrlKey || e.event.metaKey)) return;
    const lineContent = editor
      .getModel()
      .getLineContent(e.target.position.lineNumber);
    const match = lineContent.match(/#\/components\/[^\s'"]+/);
    if (match) {
      const ref = match[0];
      scrollToRefInEditor(editor, ref);
      e.event.preventDefault();
    }
  });

  // --- Improved scroll + highlight target section ---
  function scrollToRefInEditor(editor, refPath) {
    const model = editor.getModel();
    const text = model.getValue();
    const lines = text.split(/\r?\n/);

    // Parse reference path like "#/components/examples/ACCC_partial_confirmation"
    const parts = refPath.replace(/^#\//, "").split("/");
    if (parts.length < 2) {
      showToast(`⚠️ Invalid ref path: ${refPath}`);
      return;
    }

    // Traverse sequentially, remembering last matched line index
    let searchStart = 0;
    let targetLine = null;

    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const regex = new RegExp(`^\\s*${seg}:\\s*(#.*)?$`);
      let foundAt = -1;

      for (let lineIdx = searchStart; lineIdx < lines.length; lineIdx++) {
        if (regex.test(lines[lineIdx])) {
          foundAt = lineIdx;
          break;
        }
      }

      if (foundAt === -1) {
        // Couldn’t find this segment; break but don’t reset to top
        targetLine = null;
        break;
      } else {
        targetLine = foundAt;
        searchStart = foundAt + 1;
      }
    }

    // Fallback: try matching only the final component name (useful for “200-PaymentStatus”)
    if (targetLine == null) {
      const finalKey = parts[parts.length - 1];
      const fallbackRegex = new RegExp(
        `^\\s*['"]?${finalKey}['"]?:\\s*(#.*)?$`,
      );
      for (let i = 0; i < lines.length; i++) {
        if (fallbackRegex.test(lines[i])) {
          targetLine = i;
          break;
        }
      }
    }

    if (targetLine == null) {
      showToast(`⚠️ Reference target not found: ${refPath}`);
      return;
    }

    // Scroll & highlight
    const position = { lineNumber: targetLine + 1, column: 1 };
    editor.revealPositionInCenter(position);

    const highlight = editor.deltaDecorations(
      [],
      [
        {
          range: new monaco.Range(
            position.lineNumber,
            1,
            position.lineNumber + 3,
            1,
          ),
          options: {
            isWholeLine: true,
            className: "ref-highlight-line",
          },
        },
      ],
    );

    setTimeout(() => editor.deltaDecorations(highlight, []), 2000);
  }

  const updatePreview = debounce(
    async (yamlText) => {
      const model = editor.getModel();

      try {
        const parsed = YAML.parse(yamlText);

        // 🔎 Run full validation (schema + spec + USS semantic checks)
        const validationResult = await validateOpenApiSpec(parsed, {
          strict: false, // we handle errors manually instead of throwing
          offline: true, // browser-safe (don't attempt remote fetches)
        });

        // Convert validation errors/warnings into Monaco markers
        const markers = getMarkersFromValidationResult(
          validationResult,
          yamlText,
          model,
        );

        monaco.editor.setModelMarkers(model, "yaml", markers);

        // ❌ If there are validation errors, stop here (no preview)
        if (validationResult.errors?.length) {
          statusEl.textContent = `❌ ${validationResult.errors.length} validation error(s)`;
          statusEl.style.color = "#f55";
          return;
        }

        // ⚠️ If only warnings exist
        if (validationResult.warnings?.length) {
          statusEl.textContent = `⚠️ Valid with ${validationResult.warnings.length} warning(s)`;
          statusEl.style.color = "orange";
        } else {
          statusEl.textContent = "✅ Valid OpenAPI document";
          statusEl.style.color = "#0f0";
        }

        // ---- Render ReDoc preview ----
        const parent = document.getElementById("previewPane");
        const newContainer = document.createElement("div");
        newContainer.id = "redoc-container-" + Date.now();
        parent.appendChild(newContainer);

        setTimeout(() => {
          try {
            Redoc.init(
              parsed,
              {
                hideDownloadButton: true,
                scrollYOffset: 50,
                theme: {
                  colors: { primary: { main: "#61affe" } },
                  typography: { fontSize: "14px" },
                },
              },
              newContainer,
            );

            setTimeout(() => {
              [...parent.children].forEach((child) => {
                if (child !== newContainer) parent.removeChild(child);
              });
            }, 1000);
          } catch (err) {
            console.error("❌ ReDoc.init error:", err);
            statusEl.textContent =
              "⚠️ Valid OpenAPI, but preview rendering failed (see console).";
            statusEl.style.color = "orange";
          }
        }, 100);
      } catch (err) {
        // This only catches YAML parse errors or unexpected crashes
        statusEl.textContent = "❌ " + (err.message || "Validation failed");
        statusEl.style.color = "#f55";

        const matches = err.message?.match(/line (\d+)/i);
        if (matches) {
          const line = parseInt(matches[1], 10);
          monaco.editor.setModelMarkers(model, "yaml", [
            {
              startLineNumber: line,
              endLineNumber: line,
              message: err.message,
              severity: monaco.MarkerSeverity.Error,
            },
          ]);
        } else {
          monaco.editor.setModelMarkers(model, "yaml", []);
        }
      }
    },
    1500,
    statusEl,
  );

  editor.onDidChangeModelContent(() => updatePreview(editor.getValue()));

  window.validateOpenAPI = async function () {
    const yamlText = editor.getValue();
    const model = editor.getModel();

    if (!yamlText.trim()) {
      statusEl.textContent = "⚠️ No content to validate.";
      statusEl.style.color = "orange";
      return;
    }

    monaco.editor.setModelMarkers(model, "yaml", []);

    try {
      statusEl.textContent = "⏳ Validating...";
      statusEl.style.color = "white";

      const parsed = YAML.parse(yamlText);

      const validationResult = await validateOpenApiSpec(parsed, {
        strict: false,
        offline: true,
      });

      const markers = getMarkersFromValidationResult(
        validationResult,
        yamlText,
        model,
      );
      monaco.editor.setModelMarkers(model, "yaml", markers);

      if (validationResult.errors?.length) {
        statusEl.textContent = `❌ ${validationResult.errors.length} validation error(s)`;
        statusEl.style.color = "#f55";
        showToast(
          `❌ Validation failed:\n\n${validationResult.errors
            .map((e) => `• ${e.message}`)
            .join("\n")}`,
        );
        return;
      }

      if (validationResult.warnings?.length) {
        statusEl.textContent = `⚠️ Valid with ${validationResult.warnings.length} warning(s)`;
        statusEl.style.color = "orange";
        showToast(
          `⚠️ Validation warnings:\n\n${validationResult.warnings
            .map((w) => `• ${w.message}`)
            .join("\n")}`,
        );
        return;
      }

      statusEl.textContent = "✅ Valid OpenAPI document";
      statusEl.style.color = "#00ff7f";
    } catch (err) {
      const msg = err?.message || "Validation failed";
      statusEl.textContent = "❌ " + msg;
      statusEl.style.color = "red";
      showToast("Validation failed:\n\n" + msg);
    }
  };

  // --- File export helpers (unchanged) ---
  function getTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}-${hh}${min}`;
  }

  window.exportYAML = function () {
    try {
      const yamlText = editor.getValue();
      if (!yamlText.trim()) {
        showToast("⚠️ No content to export!");
        return;
      }
      let fileName = "openapi.yaml";
      try {
        const parsed = YAML.parse(yamlText);
        let title = parsed?.info?.title || "openapi";
        let version = parsed?.info?.version ? `-${parsed.info.version}` : "";
        const timestamp = getTimestamp();
        title = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        fileName = `${title}${version}-${timestamp}.yaml`;
      } catch {
        const timestamp = getTimestamp();
        fileName = `openapi-${timestamp}.yaml`;
      }
      const blob = new Blob([yamlText], { type: "text/yaml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("YAML export failed:", err);
      showToast("❌ Failed to export YAML.");
    }
  };

  window.exportJSON = function () {
    try {
      const yamlText = editor.getValue();
      if (!yamlText.trim()) {
        showToast("⚠️ No content to export!");
        return;
      }
      const parsed = YAML.parse(yamlText);
      const json = JSON.stringify(parsed, null, 2);
      let fileName = "openapi.json";
      try {
        let title = parsed?.info?.title || "openapi";
        let version = parsed?.info?.version ? `-${parsed.info.version}` : "";
        const timestamp = getTimestamp();
        title = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        fileName = `${title}${version}-${timestamp}.json`;
      } catch {
        const timestamp = getTimestamp();
        fileName = `openapi-${timestamp}.json`;
      }
      const blob = new Blob([json], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("JSON export failed:", err);
      showToast("❌ Conversion error: " + err.message);
    }
  };

  // =======================================================
  // 📦 Export Dropdown UI Behavior (externalised)
  // =======================================================
  const exportMenuBtn = document.getElementById("exportMenuBtn");
  const exportDropdown = document.getElementById("exportDropdown");

  initExportDropdown(exportMenuBtn, exportDropdown);

  // =======================================================
  // 📦 Invoke Markdown Exporter
  // =======================================================

  function handleExportMarkdown(isSelective = false, selectedSchemas = []) {
    try {
      const yamlText = editor.getValue();
      const spec = YAML.parse(yamlText);
      let doc = buildDocModel(spec);

      if (isSelective && selectedSchemas.length) {
        doc = filterDocModelForSchemas(doc, selectedSchemas);
      }

      const md = exportMarkdown(doc);

      const safeTitle = (doc.meta.title || "openapi")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const fileName = `${safeTitle}-${doc.meta.version}-${Date.now()}.md`;

      downloadMarkdownFile(md, fileName);
      showToast("✅ File downloaded successfully");
    } catch (err) {
      console.error("Export failed:", err);
      showToast("❌ Failed to generate documentation. See console.");
    }
  }

  function handleExportConfluence(isSelective = false, selectedSchemas = []) {
    try {
      const yamlText = editor.getValue();
      const spec = YAML.parse(yamlText);
      let doc = buildDocModel(spec);

      if (isSelective && selectedSchemas.length) {
        doc = filterDocModelForSchemas(doc, selectedSchemas);
      }

      const wiki = exportConfluence(doc);

      const safeTitle = (doc.meta.title || "openapi")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const fileName = `${safeTitle}-${doc.meta.version}-${Date.now()}.txt`;

      downloadMarkdownFile(wiki, fileName);
      showToast("✅ File downloaded successfully");

      navigator.clipboard.writeText(wiki).then(
        () => showToast("✔️ Copied to clipboard — paste into Confluence"),
        () => showToast("⚠️ Exported but clipboard copy failed"),
      );
    } catch (err) {
      console.error("Confluence export failed:", err);
      showToast("❌ Failed to export to Confluence.");
    }
  }

  // ================================
  // Selective Schema Export Modal
  // ================================

  exportDropdown.addEventListener("click", (e) => {
    const opt = e.target.closest(".export-option");
    if (!opt) return;

    const type = opt.dataset.export;

    if (type === "markdown") {
      handleExportMarkdown();
    } else if (type === "wiki") {
      handleExportConfluence();
    } else if (type === "markdown-select") {
      openSchemaExportModal("markdown");
    } else if (type === "wiki-select") {
      openSchemaExportModal("wiki");
    }

    exportDropdown.classList.add("hidden");
  });

  const { openSchemaExportModal } = initSchemaExportModal({
    editor,
    buildDocModel,
    showToast,
    handleExportMarkdown,
    handleExportConfluence,
  });

  updatePreview(editor.getValue());
}
