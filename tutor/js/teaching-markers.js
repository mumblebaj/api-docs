// teaching-markers.js — applies gutter markers + highlights for teaching mode

let teachingDecorations = [];

/**
 * Apply teaching markers to Monaco editor.
 * Each issue must contain:
 *   - line: number (0-based)
 *   - tip: string
 */
export function applyTeachingMarkers(editor, issues) {
  if (!editor) return;

  const model = editor.getModel();
  if (!model) return;

  const newDecorations = issues.map((issue) => {
    const line = issue.line + 1; // Monaco is 1-based

    return {
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: "teaching-marker",
        glyphMarginHoverMessage: { value: issue.tip },
      },
    };
  });

  teachingDecorations = editor.deltaDecorations(teachingDecorations, newDecorations);
}

/**
 * Remove all teaching markers.
 */
export function clearTeachingMarkers() {
  if (!window.editor) return;
  teachingDecorations = window.editor.deltaDecorations(teachingDecorations, []);
}
