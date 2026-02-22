// js/editor/editorApi.js
// This binds Monaco without coupling AI code to Monaco internals.

// js/editor/editorApi.js

let boundEditor = null;

export function bindEditor(editor) {
  boundEditor = editor;
  // global fallback in case this module is imported twice due to ?v=20260222T102405Z tags
  window.__USS_MONACO_EDITOR__ = editor;
}

function getEditor() {
  return boundEditor || window.__USS_MONACO_EDITOR__ || null;
}

export function setEditorText(text) {
  const editor = getEditor();
  if (!editor) throw new Error("Editor not bound");
  editor.setValue(text);
}

export function getEditorText() {
  const editor = getEditor();
  if (!editor) throw new Error("Editor not bound");
  return editor.getValue();
}