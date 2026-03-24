export function getLayoutRefs() {
  return {
    toolbarHost: document.getElementById("xsdStudioToolbar"),
    tabsHost: document.getElementById("xsdStudioTabs"),
    xsdEditorPane: document.getElementById("xsdEditorPane"),
    xmlEditorPane: document.getElementById("xmlEditorPane"),
    validationResultsPanel: document.getElementById("validationResultsPanel"),
    warningsPanel: document.getElementById("warningsPanel"),
    schemaTreePanel: document.getElementById("schemaTreePanel"),
    statusBarHost: document.getElementById("xsdStudioStatusBar")
  };
}