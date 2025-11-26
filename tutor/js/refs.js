// js/refs.js

export function scrollToRefInEditor(editor, refPath) {
  const model = editor.getModel();
  const text = model.getValue();
  const lines = text.split(/\r?\n/);

  // Parse reference path like "#/components/responses/200-PaymentStatus"
  const parts = refPath.replace(/^#\//, "").split("/");
  if (parts.length < 2) {
    alert(`⚠️ Invalid ref path: ${refPath}`);
    return;
  }

  let searchStart = 0;
  let targetLine = null;

  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const regex = new RegExp(`^\\s*${seg}:\\s*(#.*)?$`);
    let foundAt = -1;

    for (let lineIdx = searchStart; lineIdx < lines.length; lineIdx++) {
      if (regex.test(lines[lineIdx])) {
        foundAt = lineIdx;
        break;
      }
    }

    if (foundAt === -1) {
      targetLine = null;
      break;
    } else {
      targetLine = foundAt;
      searchStart = foundAt + 1;
    }
  }

  // Fallback: match only the final key, allowing quotes
  if (targetLine == null) {
    const finalKey = parts[parts.length - 1];
    const fallbackRegex = new RegExp(
      `^\\s*['"]?${finalKey}['"]?:\\s*(#.*)?$`
    );
    for (let i = 0; i < lines.length; i++) {
      if (fallbackRegex.test(lines[i])) {
        targetLine = i;
        break;
      }
    }
  }

  if (targetLine == null) {
    alert(`⚠️ Reference target not found: ${refPath}`);
    return;
  }

  const position = { lineNumber: targetLine + 1, column: 1 };

  editor.setPosition(position);
  editor.revealLineInCenter(position.lineNumber);

  const highlight = editor.deltaDecorations(
    [],
    [
      {
        range: new monaco.Range(
          position.lineNumber,
          1,
          position.lineNumber + 3,
          1
        ),
        options: {
          isWholeLine: true,
          className: "ref-target-highlight",
        },
      },
    ]
  );

  setTimeout(() => editor.deltaDecorations(highlight, []), 2000);
}
