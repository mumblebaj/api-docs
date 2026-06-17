export function getLayoutRefs() {
  return {
    toolbarHost: document.getElementById("xsdStudioToolbar"),
    sidebarHost: document.getElementById("xsdStudioSidebar"),
    sidebarToggle: document.getElementById("xsdStudioSidebarToggle"),
    bottomPanel: document.getElementById("xsdStudioBottomPanel"),
    bottomPanelClose: document.getElementById("xsdStudioBottomPanelClose"),
    tabsHost: document.getElementById("xsdStudioTabs"),
    xsdEditorPane: document.getElementById("xsdEditorPane"),
    xmlEditorPane: document.getElementById("xmlEditorPane"),
    validationResultsPanel: document.getElementById("validationResultsPanel"),
    warningsPanel: document.getElementById("warningsPanel"),
    schemaTreePanel: document.getElementById("schemaTreePanel"),
    statusBarHost: document.getElementById("xsdStudioStatusBar")
  };
}
