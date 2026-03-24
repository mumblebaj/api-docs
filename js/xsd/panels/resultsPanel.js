export function createResultsPanel(host) {
  let onSelectDiagnostic = null;

  return {
    onSelect(fn) {
      onSelectDiagnostic = fn;
    },

    renderEmpty() {
      host.innerHTML = `<div class="results-empty">Run validation to see results.</div>`;
    },

    renderDiagnostics(diagnostics) {
      if (!diagnostics.length) {
        host.innerHTML = `<div class="results-ok">No issues found.</div>`;
        return;
      }

      host.innerHTML = diagnostics
        .map(
          (d, index) => `
            <button
              type="button"
              class="result-item result-item--${escapeHtml(d.severity)}"
              data-diagnostic-index="${index}"
            >
              <span class="result-item__badge">${escapeHtml(d.severity.toUpperCase())}</span>
              <span class="result-item__target">${escapeHtml(d.target.toUpperCase())}</span>
              <span class="result-item__message">${escapeHtml(d.message)}</span>
              <span class="result-item__location">Ln ${Number(d.line) || 1}, Col ${Number(d.column) || 1}</span>
            </button>
          `
        )
        .join("");

      host.querySelectorAll("[data-diagnostic-index]").forEach((node) => {
        node.addEventListener("click", () => {
          const index = Number(node.dataset.diagnosticIndex);
          const diagnostic = diagnostics[index];
          if (diagnostic && onSelectDiagnostic) {
            onSelectDiagnostic(diagnostic);
          }
        });
      });
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}