export function ensureMonaco() {
  return new Promise((resolve) => {
    window.require.config({
      paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
      }
    });

    window.require(["vs/editor/editor.main"], () => {
      resolve(window.monaco);
    });
  });
}

export function configureEditorTheme(monaco) {
  monaco.editor.defineTheme("uss-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {}
  });

  monaco.editor.setTheme("uss-dark");
}