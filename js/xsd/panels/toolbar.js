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
    </div>
  `;

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
    }
  };
}