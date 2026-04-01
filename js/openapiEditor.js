// openapiEditor.js

import {
  buildDocModel,
  filterDocModelForSchemas,
} from "./exporter/docModel.js?v=20260401T180436Z";
import { exportMarkdown } from "./exporter/exportMarkdown.js?v=20260401T180436Z";
import { downloadMarkdownFile } from "./exporter/downloadUtils.js?v=20260401T180436Z";
import { exportConfluence } from "./exporter/exportConfluence.js?v=20260401T180436Z";

import { showToast } from "./ui/toast.js?v=20260401T180436Z";
import { initExportDropdown } from "./ui/dropdown.js?v=20260401T180436Z";

import { initSchemaExportModal } from "./schemaExport/schemaExportModal.js?v=20260401T180436Z";

// AI Imports
import { bindEditor } from "./editor/editorApi.js?v=20260401T180436Z";
import { initAiPanel } from "./ai/aiPanel.js?v=20260401T180436Z";
import { initAiToggle } from "./ai/aiToggle.js?v=20260401T180436Z";

// ✅ New refactor module imports
import { debounce } from "./utils/debounce.js?v=20260401T180436Z";
import { validateOpenApiSpec } from "./openapi/validate.js?v=20260401T180436Z";
import { getMarkersFromValidationResult } from "./openapi/markers.js?v=20260401T180436Z";
import { renderRedocPreview } from "./preview/redoc.js?v=20260401T180436Z";
// console.log("[USS] renderRedocPreview imported:", renderRedocPreview);

import defaultYamlTemplate from "./template.js?v=20260401T180436Z";

// -------------------------------------------------------
// YAML global shim (js-yaml vs YAML)
// -------------------------------------------------------
window.YAML = window.YAML || window.jsyaml || {};
if (
  typeof window.YAML.parse !== "function" &&
  typeof window.YAML.load === "function"
) {
  window.YAML.parse = window.YAML.load;
  window.YAML.stringify = window.YAML.dump;
}

// -------------------------------------------------------
// Filter known noisy console error
// -------------------------------------------------------
const oldError = console.error;
console.error = function (...args) {
  if (typeof args[0] === "string" && args[0].includes("Check dependency list!"))
    return;
  oldError.apply(console, args);
};

// -------------------------------------------------------
// Guarded Monaco loader (AMD)
// -------------------------------------------------------
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

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentTheme =
  localStorage.getItem("editorTheme") || (prefersDark ? "hc-black" : "vs");

require(["vs/editor/editor.main"], () => {
  monaco.editor.setTheme(currentTheme);
});

window.addEventListener("DOMContentLoaded", () => {
  const themeSelect = document.getElementById("themeSelect");
  if (!themeSelect) return;

  themeSelect.value = currentTheme;

  themeSelect.addEventListener("change", (e) => {
    const selected = e.target.value;
    currentTheme = selected;
    monaco.editor.setTheme(currentTheme);
    localStorage.setItem("editorTheme", currentTheme);
    document.body.dataset.theme = currentTheme === "vs" ? "light" : "dark";
    applyEditorContainerTheme();
  });

  applyEditorContainerTheme();
});

function applyEditorContainerTheme() {
  const yamlEditor = document.getElementById("yamlEditor");
  if (!yamlEditor) return;

  switch (currentTheme) {
    case "vs":
      yamlEditor.style.backgroundColor = "#ffffff";
      break;
    case "vs-dark":
      yamlEditor.style.backgroundColor = "#1e1e1e";
      break;
    case "hc-black":
      yamlEditor.style.backgroundColor = "#000000";
      break;
  }
}

// =======================================================
// Init Monaco
// =======================================================
function initMonaco() {
  const editor = monaco.editor.create(document.getElementById("yamlEditor"), {
    value:
      defaultYamlTemplate ||
      `openapi: 3.0.2\ninfo:\n  title: Add title here\n  version: 1.0.0`,
    language: "yaml",
    theme: currentTheme,
    automaticLayout: true,
  });

  // Bind AI + editor API
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
    const pos = e.target.position;
    if (!pos) return;

    const lineContent = editor.getModel().getLineContent(pos.lineNumber);
    const match = lineContent.match(/#\/components\/[^\s'"]+/);
    if (match) {
      scrollToRefInEditor(editor, match[0]);
      e.event.preventDefault();
    }
  });

  // --- Improved scroll + highlight target section ---
  function scrollToRefInEditor(editor, refPath) {
    const model = editor.getModel();
    const text = model.getValue();
    const lines = text.split(/\r?\n/);

    const parts = refPath.replace(/^#\//, "").split("/");
    if (parts.length < 2) {
      showToast(`⚠️ Invalid ref path: ${refPath}`);
      return;
    }

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
        targetLine = null;
        break;
      } else {
        targetLine = foundAt;
        searchStart = foundAt + 1;
      }
    }

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

  // -------------------------------------------------------
  // Debounced preview update (validation -> markers -> preview)
  // -------------------------------------------------------
  const updatePreview = debounce(
    async (yamlText) => {
      try {
        const parsed = YAML.parse(yamlText);

        const validationResult = await validateOpenApiSpec(parsed, {
          strict: false,
          offline: true,
        });

        const markers = getMarkersFromValidationResult(
          validationResult,
          yamlText,
          model,
          monaco,
        );
        monaco.editor.setModelMarkers(model, "yaml", markers);

        if (validationResult.errors?.length) {
          statusEl.textContent = `❌ ${validationResult.errors.length} validation error(s)`;
          statusEl.style.color = "#f55";
          return; // no preview
        }

        const warnings = validationResult.warnings || [];
        const warningCount = warnings.filter(
          (w) => w?.severity !== "info",
        ).length;
        const infoCount = warnings.filter((w) => w?.severity === "info").length;

        if (warningCount > 0) {
          statusEl.textContent =
            infoCount > 0
              ? `⚠️ Valid with ${warningCount} warning(s) (+${infoCount} info)`
              : `⚠️ Valid with ${warningCount} warning(s)`;
          statusEl.style.color = "orange";
        } else {
          // Only info (or no warnings at all) -> treat as valid
          statusEl.textContent =
            infoCount > 0
              ? `✅ Valid OpenAPI document (+${infoCount} info)`
              : "✅ Valid OpenAPI document";
          statusEl.style.color = "#0f0";
        }

        // ✅ Render preview via module (handles ensureReDocLoaded + safe swap)
        const parent = document.getElementById("previewPane");
        try {
          await renderRedocPreview(parsed, parent);
        } catch (err) {
          console.error("❌ Preview render failed:", err);
          statusEl.textContent =
            "⚠️ Valid OpenAPI, but preview rendering failed (see console).";
          statusEl.style.color = "orange";
        }
      } catch (err) {
        // YAML parse errors / unexpected crashes
        const msg = err?.message || "Validation failed";
        statusEl.textContent = "❌ " + msg;
        statusEl.style.color = "#f55";

        const matches = msg.match(/line (\d+)/i);
        if (matches) {
          const line = parseInt(matches[1], 10);
          monaco.editor.setModelMarkers(model, "yaml", [
            {
              startLineNumber: line,
              endLineNumber: line,
              message: msg,
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

  // -------------------------------------------------------
  // Manual validate button handler (same pipeline)
  // -------------------------------------------------------
  window.validateOpenAPI = async function () {
    const yamlText = editor.getValue();

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
        monaco,
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

      const warnings = validationResult.warnings || [];
      const warningCount = warnings.filter(
        (w) => w?.severity !== "info",
      ).length;
      const infoCount = warnings.filter((w) => w?.severity === "info").length;

      if (warningCount > 0) {
        statusEl.textContent =
          infoCount > 0
            ? `⚠️ Valid with ${warningCount} warning(s) (+${infoCount} info)`
            : `⚠️ Valid with ${warningCount} warning(s)`;
        statusEl.style.color = "orange";

        showToast(
          `⚠️ Validation warnings:\n\n${warnings
            .filter((w) => w?.severity !== "info")
            .map((w) => `• ${w.message}`)
            .join("\n")}`,
        );
      } else {
        statusEl.textContent =
          infoCount > 0
            ? `✅ Valid OpenAPI document (+${infoCount} info)`
            : "✅ Valid OpenAPI document";
        statusEl.style.color = "#00ff7f";

        if (infoCount > 0) {
          showToast(
            `ℹ️ Validation info:\n\n${warnings
              .filter((w) => w?.severity === "info")
              .map((w) => `• ${w.message}`)
              .join("\n")}`,
          );
        }
      }
      // NOTE: Do not return here—manual validation should not block preview on warnings/info.
    } catch (err) {
      const msg = err?.message || "Validation failed";
      statusEl.textContent = "❌ " + msg;
      statusEl.style.color = "red";
      showToast("Validation failed:\n\n" + msg);
    }
  };

  // -------------------------------------------------------
  // Export helpers (unchanged)
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // Export dropdown wiring (unchanged)
  // -------------------------------------------------------
  const exportMenuBtn = document.getElementById("exportMenuBtn");
  const exportDropdown = document.getElementById("exportDropdown");
  initExportDropdown(exportMenuBtn, exportDropdown);

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

  // Initial validation + preview render
  updatePreview(editor.getValue());
}
