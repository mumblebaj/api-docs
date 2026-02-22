// js/monaco-setup.js

import {
  explainYamlLine,
  getYamlHierarchy,
  renderBreadcrumb,
  renderMarkdown,
} from "./yaml-utils.js";
import {
  buildOpenApiModel,
  collectAllValidationErrors,
  renderLiveErrors,
  openApiExplain,
  parseRef,
  refExistsInModel,
} from "./openapi-model.js";
import { scrollToRefInEditor } from "./refs.js";

// import { getMonacoTheme } from "../js/editor-theme.js";

// editorInstance.updateOptions({
//   theme: getMonacoTheme()
// });

let monacoEditor = null;
let openApiModel = null;
let lastGoodOpenApiModel = null;

let monacoDecorations = [];
let refDecorations = [];
let refTargetDecoration = [];

export function getMonacoEditor() {
  return monacoEditor;
}

export function initMonaco() {
  return new Promise((resolve) => {
    const container = document.getElementById("monacoContainer");
    const tipsOutput = document.getElementById("tipsOutput");
    const yamlInput = document.getElementById("yamlInput");

    if (!container) return resolve(null);

    require(["vs/editor/editor.main"], () => {
      // 1. Create the Monaco editor
      monacoEditor = monaco.editor.create(container, {
        value: yamlInput ? yamlInput.value : "",
        language: "yaml",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        hover: { enabled: true, above: false, sticky: true }
      });

      window.editor = monacoEditor;

      // 2. Register click + hover providers
      registerMonacoClickHandler(monacoEditor, tipsOutput);
      registerMonacoHoverProvider();

      // 3. Register content-change handler (MUST be inside require callback)
      monacoEditor.onDidChangeModelContent(() => {
        const value = monacoEditor.getValue();
        if (yamlInput) yamlInput.value = value;

        try {
          const model = buildOpenApiModel(value);
          if (model) {
            openApiModel = model;
            lastGoodOpenApiModel = model;
          }
        } catch (e) {
          openApiModel = lastGoodOpenApiModel;
        }

        const errs = collectAllValidationErrors(
          value,
          openApiModel || lastGoodOpenApiModel
        );
        renderLiveErrors(errs);

        applyRefDecorations();
      });

      // 4. Finally resolve the editor so tutor.js can use it
      resolve(monacoEditor);
    });
  });
}


// Underline $ref with green/red
function applyRefDecorations() {
  if (!monacoEditor) return;

  const model = monacoEditor.getModel();
  if (!model) return;

  if (!openApiModel) {
    openApiModel = lastGoodOpenApiModel;
  }
  if (!openApiModel) {
    refDecorations = monacoEditor.deltaDecorations(refDecorations, []);
    return;
  }

  const value = model.getValue();
  const lines = value.split(/\r?\n/);
  const newDecos = [];

  lines.forEach((line, i) => {
    const m = line.match(
      /\$ref:\s*['"]?(#\/components\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+)['"]?/
    );
    if (!m) return;

    const refFull = m[1].trim();
    const isValid = refExistsInModel(refFull, openApiModel);

    const colStart = line.indexOf("$ref:") + 1;
    const colEnd = colStart + m[0].length;

    newDecos.push({
      range: new monaco.Range(i + 1, colStart, i + 1, colEnd),
      options: {
        inlineClassName: isValid
          ? "ref-valid-underline"
          : "ref-error-underline",
      },
    });
  });

  refDecorations = monacoEditor.deltaDecorations(refDecorations, newDecos);
}

function registerMonacoClickHandler(editor, tipsOutput) {
  editor.onMouseDown((e) => {
    if (
      !e.target ||
      e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT
    ) {
      return;
    }

    const position = e.target.position;
    const model = editor.getModel();
    const lineIndex = position.lineNumber - 1;
    const allLines = model.getValue().split(/\r?\n/);
    const line = allLines[lineIndex] || "";

    if (!openApiModel && lastGoodOpenApiModel) {
      openApiModel = lastGoodOpenApiModel;
    }

    // 1) $ref click → scroll
    if (line.trim().startsWith("$ref:")) {
      const ref = line.trim().replace("$ref:", "").trim().replace(/['"]/g, "");
      scrollToRefInEditor(editor, ref);
    }

    // 2) Explanation for Tips panel
    const hierarchy = getYamlHierarchy(allLines, lineIndex);
    const explanation =
      explainYamlLine(line) +
      renderBreadcrumb(hierarchy) +
      openApiExplain(line, hierarchy, openApiModel);

    if (tipsOutput) {
      tipsOutput.innerHTML = renderMarkdown(explanation);
    }

    // 3) Highlight clicked line
    monacoDecorations = editor.deltaDecorations(monacoDecorations, [
      {
        range: new monaco.Range(
          lineIndex + 1,
          1,
          lineIndex + 1,
          line.length + 1
        ),
        options: {
          isWholeLine: true,
          className: "monaco-line-highlight",
          marginClassName: "monaco-line-highlight-gutter",
        },
      },
    ]);
  });
}

function registerMonacoHoverProvider() {
  monaco.languages.registerHoverProvider("yaml", {
    provideHover(model, position) {
      const lineIndex = position.lineNumber - 1;
      const allLines = model.getValue().split(/\r?\n/);
      const line = allLines[lineIndex] || "";

      if (!openApiModel && lastGoodOpenApiModel) {
        openApiModel = lastGoodOpenApiModel;
      }

      let md = "";
      md += `### Node Details\n`;
      md += `**Line:** ${lineIndex + 1}\n`;

      const keyMatch = line.match(/^\s*([A-Za-z0-9_-]+)\s*:/);
      if (keyMatch) md += `**Key:** \`${keyMatch[1]}\`\n`;

      const hierarchy = getYamlHierarchy(allLines, lineIndex);
      if (hierarchy.length > 0) {
        md += `\n### Path\n`;
        md += hierarchy.map((h) => `- ${h}`).join("\n") + "\n";
      }

      const refMatch = line.match(/\$ref:\s*['"]?([^'"]+)['"]?/);
      if (refMatch) {
        const ref = refMatch[1].trim();
        const parsed = parseRef(ref);

        md += `\n### Reference\n`;
        md += `\`$ref: ${ref}\`\n`;

        if (parsed && parsed.section && parsed.name) {
          if (refExistsInModel(ref, openApiModel)) {
            md += `\n✔ **Resolved:** \`${parsed.section}/${parsed.name}\`\n`;
          } else {
            md += `\n❌ **Unresolved reference:** \`${ref}\`\n`;
            md += `Component not found under \`components.${parsed.section}\`.\n`;
          }
        } else {
          md += `\n⚠ Unable to parse this $ref path.\n`;
        }
      }

      if (!md.trim()) return null;

      return {
        range: new monaco.Range(
          position.lineNumber,
          1,
          position.lineNumber,
          line.length + 1
        ),
        contents: [{ value: md }],
      };
    },
  });
}
