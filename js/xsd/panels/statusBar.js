export function createStatusBar(host) {
  return {
    render({ xsdStatus, xmlStatus, summary }) {
      host.innerHTML = `
        <div class="status-bar__item"><strong>XSD:</strong> ${xsdStatus}</div>
        <div class="status-bar__item"><strong>XML:</strong> ${xmlStatus}</div>
        <div class="status-bar__item"><strong>Status:</strong> ${summary}</div>
      `;
    }
  };
}