import { mapDiagnosticsToMarkers, clearAllMarkers } from "../validation/markerMapping.js";
import { formatXml } from "../generators/formatXml.js";
import { formatXsd } from "../generators/formatXsd.js";
import { downloadTextFile } from "../io/download.js";
import {
  runXsdDiagnostics,
  runGenerateXml,
  runValidateXml as runEngineValidateXml
} from "../engineAdapter.js";

export function registerStudioActions(ctx) {
  const { toolbar } = ctx;

  toolbar.onValidateXsd(() => runValidateXsdOnly(ctx));
  toolbar.onValidateXml(() => runValidateXmlOnly(ctx));
  toolbar.onFormatXsd(() => runFormatXsd(ctx));
  toolbar.onFormatXml(() => runFormatXml(ctx));
  toolbar.onDownloadXsd(() => downloadXsd(ctx));
  toolbar.onDownloadXml(() => downloadXml(ctx));
  toolbar.onGenerateXml(() => runGenerateXmlAction(ctx));
}

function runValidateXsdOnly(ctx) {
  const { editors, resultsPanel, statusBar, state, layout } = ctx;
  const xsdText = editors.xsd.getValue();

  let diagnostics = [];

  try {
    diagnostics = runXsdDiagnostics(xsdText);
  } catch (error) {
    diagnostics = [
      {
        target: "xsd",
        severity: "error",
        message: error.message || "XSD validation failed.",
        line: 1,
        column: 1
      }
    ];
  }

  applyDiagnostics(ctx, diagnostics);

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  if (state.ui.activeTab === "warnings") {
    renderWarnings(layout.warningsPanel, warnings);
  }

  statusBar.render({
    xsdStatus: errors.length ? "Invalid" : "OK",
    xmlStatus: "Ready",
    summary: diagnostics.length
      ? `${diagnostics.length} issue(s): ${errors.length} error(s), ${warnings.length} warning(s)`
      : "XSD validation passed"
  });
}

function runValidateXmlOnly(ctx) {
  const { editors, statusBar, state, layout } = ctx;
  const xsdText = editors.xsd.getValue();
  const xmlText = editors.xml.getValue();

  let xsdDiagnostics = [];
  let xmlDiagnostics = [];
  let diagnostics = [];

  try {
    xsdDiagnostics = runXsdDiagnostics(xsdText);

    if (xsdDiagnostics.some((d) => d.severity === "error")) {
      diagnostics = xsdDiagnostics;
    } else {
      xmlDiagnostics = runEngineValidateXml(xsdText, xmlText);
      diagnostics = [...xsdDiagnostics, ...xmlDiagnostics];
    }
  } catch (error) {
    diagnostics = [
      {
        target: "xsd",
        severity: "error",
        message: error.message || "XML validation failed.",
        line: 1,
        column: 1
      }
    ];
  }

  applyDiagnostics(ctx, diagnostics);

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  if (state.ui.activeTab === "warnings") {
    renderWarnings(layout.warningsPanel, warnings);
  }

  statusBar.render({
    xsdStatus: xsdDiagnostics.some((d) => d.severity === "error") ? "Invalid" : "OK",
    xmlStatus: xmlDiagnostics.some((d) => d.severity === "error") ? "Invalid" : "OK",
    summary: diagnostics.length
      ? `${diagnostics.length} issue(s): ${errors.length} error(s), ${warnings.length} warning(s)`
      : "XML validation passed"
  });
}

function applyDiagnostics(ctx, diagnostics) {
  const { editors, resultsPanel, state } = ctx;

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  state.validation.diagnostics = diagnostics;
  state.validation.errors = errors;
  state.validation.warnings = warnings;

  clearAllMarkers(editors);
  mapDiagnosticsToMarkers(editors, diagnostics);
  resultsPanel.renderDiagnostics(diagnostics);
}

function renderWarnings(host, warnings) {
  host.innerHTML = warnings.length
    ? warnings
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
        .join("")
    : `<div class="results-empty">No warnings.</div>`;
}

function runFormatXsd(ctx) {
  const { editors, resultsPanel, statusBar, state } = ctx;

  try {
    const formatted = formatXsd(editors.xsd.getValue());
    editors.xsd.setValue(formatted);

    resultsPanel.renderDiagnostics([]);
    statusBar.render({
      xsdStatus: "Formatted",
      xmlStatus: "Ready",
      summary: "XSD formatted successfully"
    });
  } catch (error) {
    const diagnostic = {
      target: "xsd",
      severity: "error",
      message: error.message || "Failed to format XSD.",
      line: 1,
      column: 1
    };

    state.validation.diagnostics = [diagnostic];
    state.validation.errors = [diagnostic];
    state.validation.warnings = [];

    clearAllMarkers(editors);
    mapDiagnosticsToMarkers(editors, [diagnostic]);
    resultsPanel.renderDiagnostics([diagnostic]);

    statusBar.render({
      xsdStatus: "Format failed",
      xmlStatus: "Ready",
      summary: "XSD formatting failed"
    });
  }
}

function runFormatXml(ctx) {
  const { editors, resultsPanel, statusBar, state } = ctx;

  try {
    const formatted = formatXml(editors.xml.getValue());
    editors.xml.setValue(formatted);

    resultsPanel.renderDiagnostics([]);
    statusBar.render({
      xsdStatus: "Ready",
      xmlStatus: "Formatted",
      summary: "XML formatted successfully"
    });
  } catch (error) {
    const diagnostic = {
      target: "xml",
      severity: "error",
      message: error.message || "Failed to format XML.",
      line: 1,
      column: 1
    };

    state.validation.diagnostics = [diagnostic];
    state.validation.errors = [diagnostic];
    state.validation.warnings = [];

    clearAllMarkers(editors);
    mapDiagnosticsToMarkers(editors, [diagnostic]);
    resultsPanel.renderDiagnostics([diagnostic]);

    statusBar.render({
      xsdStatus: "Ready",
      xmlStatus: "Format failed",
      summary: "XML formatting failed"
    });
  }
}

function runGenerateXmlAction(ctx) {
  const { editors, resultsPanel, statusBar, state, layout } = ctx;

  try {
    const xml = runGenerateXml(editors.xsd.getValue());

    editors.xml.setValue(xml);

    state.validation.diagnostics = [];
    state.validation.errors = [];
    state.validation.warnings = [];

    clearAllMarkers(editors);
    resultsPanel.renderDiagnostics([]);

    if (layout?.warningsPanel) {
      layout.warningsPanel.innerHTML = `<div class="results-empty">No warnings.</div>`;
    }

    statusBar.render({
      xsdStatus: "OK",
      xmlStatus: "Generated",
      summary: "Sample XML generated from schema"
    });
  } catch (error) {
    const diagnostic = {
      target: "xsd",
      severity: "error",
      message: error.message || "Failed to generate XML from XSD.",
      line: 1,
      column: 1
    };

    state.validation.diagnostics = [diagnostic];
    state.validation.errors = [diagnostic];
    state.validation.warnings = [];

    clearAllMarkers(editors);
    mapDiagnosticsToMarkers(editors, [diagnostic]);
    resultsPanel.renderDiagnostics([diagnostic]);

    if (layout?.warningsPanel) {
      layout.warningsPanel.innerHTML = `<div class="results-empty">No warnings.</div>`;
    }

    statusBar.render({
      xsdStatus: "Invalid",
      xmlStatus: "Not generated",
      summary: diagnostic.message
    });
  }
}

function downloadXsd(ctx) {
  const { editors, state } = ctx;
  downloadTextFile(state.files.xsdName, editors.xsd.getValue(), "application/xml");
}

function downloadXml(ctx) {
  const { editors, state } = ctx;
  downloadTextFile(state.files.xmlName, editors.xml.getValue(), "application/xml");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}