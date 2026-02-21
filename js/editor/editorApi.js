// js/editor/editorApi.js
// This binds Monaco without coupling AI code to Monaco internals.

let _editor = null;

export function bindEditor(editorInstance) {
  _editor = editorInstance;
}

export function getEditorText() {
  if (!_editor) throw new Error("Editor not bound");
  return _editor.getValue();
}

export function setEditorText(text) {
  if (!_editor) throw new Error("Editor not bound");
  _editor.setValue(text);
}