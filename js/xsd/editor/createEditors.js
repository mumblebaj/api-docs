import { configureEditorTheme, ensureMonaco } from "./editorTheme.js";

export async function createEditors({ xsdHost, xmlHost, initialXsd, initialXml }) {
  const monaco = await ensureMonaco();
  configureEditorTheme(monaco);

  const sharedOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    tabSize: 2,
    insertSpaces: true,
    fontSize: 14
  };

  const xsd = monaco.editor.create(xsdHost, {
    ...sharedOptions,
    value: initialXsd,
    language: "xml"
  });

  const xml = monaco.editor.create(xmlHost, {
    ...sharedOptions,
    value: initialXml,
    language: "xml"
  });

  return { monaco, xsd, xml };
}