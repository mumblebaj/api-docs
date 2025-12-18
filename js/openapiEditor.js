// openapiEditor.js — Created by mumblebaj

import { buildDocModel } from "./exporter/docModel.js?v=20251214T182209Z";
import { filterDocModelForSchemas } from "./exporter/docModel.js?v=20251214T182209Z";
import { exportMarkdown } from "./exporter/exportMarkdown.js?v=20251214T182209Z";
import { downloadMarkdownFile } from "./exporter/downloadUtils.js?v=20251214T182209Z";
import { exportConfluence } from "./exporter/exportConfluence.js?v=20251214T182209Z";
import { showToast } from "./ui/toast.js?v=20251214T182209Z";
import { initExportDropdown } from "./ui/dropdown.js?v=20251214T182209Z";
import {
  createSelectionState,
  applyUserSelection,
  applyUserDeselection,
  getFinalSelection,
  getDependencyCount,
} from "./schemaExport/selectionUtils.js?v=20251214T182209Z";
import { buildSchemaDependencyMap } from "./schemaExport/dependencyResolver.js?v=20251214T182209Z";
import { initSchemaExportModal } from "./schemaExport/schemaExportModal.js";

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

import defaultYamlTemplate from "./template.js?v=20251214T182209Z";

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

// --- SwaggerClient → SwaggerParser shim -------------------
if (window.SwaggerClient && !window.SwaggerParser) {
  window.SwaggerParser = {
    async validate(api) {
      try {
        await window.SwaggerClient.resolve({
          spec: api,
          allowMetaPatches: false,
          requestInterceptor: () => {},
          useCircularStructures: false,
          mode: "strict",
        });
        return true;
      } catch (err) {
        if (err.message && err.message.includes("readFile")) {
          console.warn("⚠️ Ignored external $ref resolution:", err.message);
          return true;
        }
        console.error("Validation failed:", err);
        throw err;
      }
    },
  };
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
              endPos.column
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
        `^\\s*['"]?${finalKey}['"]?:\\s*(#.*)?$`
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
            1
          ),
          options: {
            isWholeLine: true,
            className: "ref-highlight-line",
          },
        },
      ]
    );

    setTimeout(() => editor.deltaDecorations(highlight, []), 2000);
  }

  // --- Debounced ReDoc Preview ---
  const updatePreview = debounce(
    async (yamlText) => {
      try {
        const parsed = YAML.parse(yamlText);
        await SwaggerParser.validate(parsed);
        statusEl.textContent = "✅ Valid OpenAPI document";
        statusEl.style.color = "#0f0";

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
              newContainer
            );
            setTimeout(() => {
              [...parent.children].forEach((child) => {
                if (child !== newContainer) parent.removeChild(child);
              });
            }, 1000);
          } catch (err) {
            console.error("❌ ReDoc.init error:", err);
          }
        }, 100);

        monaco.editor.setModelMarkers(editor.getModel(), "yaml", []);
      } catch (err) {
        statusEl.textContent = "❌ " + err.message;
        statusEl.style.color = "#f55";
        const matches = err.message.match(/line (\d+)/i);
        if (matches) {
          const line = parseInt(matches[1]);
          monaco.editor.setModelMarkers(editor.getModel(), "yaml", [
            {
              startLineNumber: line,
              endLineNumber: line,
              message: err.message,
              severity: monaco.MarkerSeverity.Error,
            },
          ]);
        }
      }
    },
    1500,
    statusEl
  );

  editor.onDidChangeModelContent(() => updatePreview(editor.getValue()));

  // --- 🧩 Enhanced Validate Button ---
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
      const parsed = YAML.parse(yamlText);
      statusEl.textContent = "⏳ Validating...";
      statusEl.style.color = "white";

      await SwaggerParser.validate(parsed);

      const missingRefs = [];
      const allRefs = [
        ...yamlText.matchAll(/\$ref:\s*['"]?(#\/components\/[^\s'"]+)['"]?/g),
      ].map((m) => m[1]);

      // --- object-based component map (robust + quote/hyphen safe) ---
      const definedComponents = {};
      const componentsRoot = parsed?.components || {};
      const componentTypes = [
        "schemas",
        "responses",
        "parameters",
        "requestBodies",
        "headers",
        "securitySchemes",
        "examples",
        "links",
        "callbacks",
      ];
      for (const type of componentTypes) {
        if (componentsRoot[type] && typeof componentsRoot[type] === "object") {
          definedComponents[type] = new Set(Object.keys(componentsRoot[type]));
        }
      }

      // --- check each $ref ---
      for (const ref of allRefs) {
        const parts = ref.split("/");
        const type = parts[2];
        const name = parts[3];
        if (!definedComponents[type] || !definedComponents[type].has(name)) {
          missingRefs.push(ref);
        }
      }

      if (missingRefs.length > 0) {
        const markers = [];
        for (const ref of missingRefs) {
          const regex = new RegExp(`\\$ref:\\s*['"]?${ref}['"]?`);
          const match = yamlText.match(regex);
          if (match) {
            const start = yamlText.indexOf(match[0]);
            const startPos = model.getPositionAt(start);
            const endPos = model.getPositionAt(start + match[0].length);
            markers.push({
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
              message: `Unresolved reference: ${ref}`,
              severity: monaco.MarkerSeverity.Error,
            });
          }
        }
        monaco.editor.setModelMarkers(model, "yaml", markers);
        statusEl.textContent = `❌ ${missingRefs.length} unresolved $ref(s) found`;
        statusEl.style.color = "red";
        showToast(
          `❌ Validation failed:\n\nUnresolved references:\n${missingRefs.join(
            "\n"
          )}`
        );
        return;
      }

      statusEl.textContent = "✅ Valid OpenAPI document";
      statusEl.style.color = "#00ff7f";
    } catch (err) {
      console.error("Validation error:", err);
      statusEl.textContent = "❌ Invalid OpenAPI document";
      statusEl.style.color = "red";
      showToast("Validation failed:\n\n" + (err.message || "Unknown error"));
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
        () => showToast("⚠️ Exported but clipboard copy failed")
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
