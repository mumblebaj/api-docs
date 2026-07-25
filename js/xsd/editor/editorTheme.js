const MONACO_VS_PATH = "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs";

function ensureAmdLoader() {
  if (typeof window.require === "function" && window.require.config) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-uss-monaco-loader="1"]');
    if (existing) {
      existing.addEventListener("load", () => {
        if (typeof window.require === "function" && window.require.config) {
          resolve();
        } else {
          reject(new Error("Monaco AMD loader loaded but window.require is unavailable."));
        }
      });
      existing.addEventListener("error", () => {
        reject(new Error("Failed to load Monaco AMD loader script."));
      });
      return;
    }

    const s = document.createElement("script");
    s.src = `${MONACO_VS_PATH}/loader.js`;
    s.async = true;
    s.dataset.ussMonacoLoader = "1";

    s.onload = () => {
      if (typeof window.require === "function" && window.require.config) {
        resolve();
      } else {
        reject(new Error("Monaco AMD loader loaded but window.require is unavailable."));
      }
    };

    s.onerror = () => {
      reject(new Error(`Failed to load Monaco AMD loader from ${s.src}`));
    };

    document.head.appendChild(s);
  });
}

export async function ensureMonaco() {
  await ensureAmdLoader();

  return new Promise((resolve, reject) => {
    window.require.config({ paths: { vs: MONACO_VS_PATH } });
    window.require(
      ["vs/editor/editor.main"],
      () => resolve(window.monaco),
      (err) => reject(err),
    );
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