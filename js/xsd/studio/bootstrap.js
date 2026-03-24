import { getLayoutRefs } from "./layout.js";
import { createStudioState } from "./state.js";
import { createEditors } from "../editor/createEditors.js";
import { createToolbar } from "../panels/toolbar.js";
import { createTabs } from "../panels/tabs.js";
import { createResultsPanel } from "../panels/resultsPanel.js";
import { createStatusBar } from "../panels/statusBar.js";
import { registerStudioActions } from "./actions.js";
import { createSchemaTreePanel } from "../panels/schemaTreePanel.js";
import { runExtractTree } from "../engineAdapter.js";

export async function bootstrapXsdStudio() {
  const layout = getLayoutRefs();
  const state = createStudioState();

  const editors = await createEditors({
    xsdHost: layout.xsdEditorPane,
    xmlHost: layout.xmlEditorPane,
    initialXsd: state.content.xsd,
    initialXml: state.content.xml,
  });

  state.editors = editors;
  state.models = {
    xsd: editors.xsd.getModel(),
    xml: editors.xml.getModel(),
  };

  const toolbar = createToolbar(layout.toolbarHost);
  const tabs = createTabs(layout.tabsHost);
  const resultsPanel = createResultsPanel(layout.validationResultsPanel);
  const statusBar = createStatusBar(layout.statusBarHost);
  const schemaTreePanel = createSchemaTreePanel(layout.schemaTreePanel);

  const ctx = {
    layout,
    state,
    editors,
    toolbar,
    tabs,
    resultsPanel,
    schemaTreePanel,
    statusBar,
  };

  schemaTreePanel.onSelect((node) => {
    const editor = ctx.editors.xsd;
    const line = Number(node.line) || 1;
    const column = Number(node.column) || 1;

    editor.focus();
    editor.revealPositionInCenter({
      lineNumber: line,
      column,
    });
    editor.setPosition({
      lineNumber: line,
      column,
    });
  });

  tabs.onChange((tabName) => {
    state.ui.activeTab = tabName;
    setActiveBottomTab(ctx, tabName);
  });

  resultsPanel.onSelect((diagnostic) => {
    focusDiagnostic(ctx, diagnostic);
  });

  registerStudioActions(ctx);

  resultsPanel.renderEmpty();
  renderWarningsPanel(layout.warningsPanel, []);

  setActiveBottomTab(ctx, state.ui.activeTab);

  statusBar.render({
    xsdStatus: "Ready",
    xmlStatus: "Ready",
    summary: "No validation run yet",
  });
}

function setActiveBottomTab(ctx, tabName) {
  const { layout, tabs, state, schemaTreePanel } = ctx;

  tabs.setActive(tabName);

  layout.validationResultsPanel.hidden = tabName !== "results";
  layout.warningsPanel.hidden = tabName !== "warnings";
  layout.schemaTreePanel.hidden = tabName !== "schema-tree";

  if (tabName === "warnings") {
    renderWarningsPanel(layout.warningsPanel, state.validation.warnings || []);
  }

  if (tabName === "schema-tree") {
    try {
      const tree = runExtractTree(state.editors.xsd.getValue());
      schemaTreePanel.render(tree);
    } catch (error) {
      layout.schemaTreePanel.innerHTML = `
        <div class="results-empty">${escapeHtml(error.message || "Failed to build schema tree.")}</div>
      `;
    }
  }
}

function renderWarningsPanel(host, warnings) {
  if (!warnings.length) {
    host.innerHTML = `<div class="results-empty">No warnings.</div>`;
    return;
  }

  host.innerHTML = warnings
    .map(
      (warning) => `
        <div class="result-item result-item--warning is-static">
          <span class="result-item__badge">WARNING</span>
          <span class="result-item__target">${escapeHtml(warning.target.toUpperCase())}</span>
          <span class="result-item__message">${escapeHtml(warning.message)}</span>
          <span class="result-item__location">Ln ${warning.line || 1}, Col ${warning.column || 1}</span>
        </div>
      `
    )
    .join("");
}

function focusDiagnostic(ctx, diagnostic) {
  const editor =
    diagnostic.target === "xml" ? ctx.editors.xml : ctx.editors.xsd;
  const line = Number(diagnostic.line) || 1;
  const column = Number(diagnostic.column) || 1;

  editor.focus();
  editor.revealPositionInCenter({ lineNumber: line, column });
  editor.setPosition({ lineNumber: line, column });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}