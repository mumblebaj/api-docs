export function createToolbar(host) {
  host.innerHTML = `
    <div class="toolbar-group">
      <button data-action="validate-xsd">Validate XSD</button>
      <button data-action="validate-xml">Validate XML</button>
      <button data-action="generate-xml">Generate XML</button>
      <button data-action="format-xsd">Format XSD</button>
      <button data-action="format-xml">Format XML</button>
      <button data-action="download-xsd">Download XSD</button>
      <button data-action="download-xml">Download XML</button>
      <button type="button" data-action="add-external-xsd">Add External XSD(s)</button>
      <button type="button" data-action="clear-external-xsd">Clear External XSD(s)</button>
    </div>

    <div class="toolbar-group toolbar-group--external-xsd">
      <input
        type="file"
        data-action="external-xsd-input"
        accept=".xsd,.xml,text/xml,application/xml"
        multiple
        hidden
      />
      <div data-role="external-xsd-list" class="toolbar-external-xsd-list"></div>
    </div>
  `;

  const externalInput = host.querySelector('[data-action="external-xsd-input"]');
  const externalList = host.querySelector('[data-role="external-xsd-list"]');

function renderExternalDocuments(documents = {}) {
  const names = Object.keys(documents).sort((a, b) => a.localeCompare(b));

  if (!names.length) {
    externalList.innerHTML = `<div class="toolbar-external-xsd-empty">No external XSDs loaded.</div>`;
    return;
  }

  externalList.innerHTML = `
    <div class="toolbar-external-xsd-chips">
      ${names
        .map(
          (name) => `
            <div class="toolbar-external-xsd-chip" title="${escapeHtml(name)}">
              <span class="toolbar-external-xsd-chip__name">${escapeHtml(name)}</span>
              <button
                type="button"
                class="toolbar-external-xsd-chip__remove"
                data-remove-external-xsd="${escapeHtmlAttr(name)}"
                aria-label="Remove ${escapeHtmlAttr(name)}"
                title="Remove ${escapeHtmlAttr(name)}"
              >
                ×
              </button>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

  host.addEventListener("click", (event) => {
    const removeName = event.target?.getAttribute?.("data-remove-external-xsd");
    if (!removeName) return;

    if (typeof host._onRemoveExternalXsd === "function") {
      host._onRemoveExternalXsd(removeName);
    }
  });

  return {
    onValidateXsd(fn) {
      host.querySelector('[data-action="validate-xsd"]').onclick = fn;
    },

    onValidateXml(fn) {
      host.querySelector('[data-action="validate-xml"]').onclick = fn;
    },

    onGenerateXml(fn) {
      host.querySelector('[data-action="generate-xml"]').onclick = fn;
    },

    onFormatXsd(fn) {
      host.querySelector('[data-action="format-xsd"]').onclick = fn;
    },

    onFormatXml(fn) {
      host.querySelector('[data-action="format-xml"]').onclick = fn;
    },

    onDownloadXsd(fn) {
      host.querySelector('[data-action="download-xsd"]').onclick = fn;
    },

    onDownloadXml(fn) {
      host.querySelector('[data-action="download-xml"]').onclick = fn;
    },

    onAddExternalXsd(fn) {
      host.querySelector('[data-action="add-external-xsd"]').onclick = () => {
        externalInput.click();
      };

      externalInput.onchange = (event) => {
        fn(event.target.files || []);
        externalInput.value = "";
      };
    },

    onClearExternalXsd(fn) {
      host.querySelector('[data-action="clear-external-xsd"]').onclick = fn;
    },

    onRemoveExternalXsd(fn) {
      host._onRemoveExternalXsd = fn;
    },

    renderExternalDocuments
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

function escapeHtmlAttr(value) {
  return escapeHtml(value);
}