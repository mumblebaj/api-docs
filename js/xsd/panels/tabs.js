const TAB_DEFS = [
  { name: "results", label: "Results" },
  { name: "warnings", label: "Warnings" },
  { name: "schema-tree", label: "Schema Tree" }
];

export function createTabs(host) {
  host.innerHTML = `
    <div class="tabs-group">
      ${TAB_DEFS.map(
        (tab) => `
          <button type="button" data-tab="${tab.name}" class="${tab.name === "results" ? "is-active" : ""}">
            ${tab.label}
          </button>
        `
      ).join("")}
    </div>
  `;

  return {
    onChange(fn) {
      host.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          fn(btn.dataset.tab);
        });
      });
    },

    setActive(tabName) {
      host.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.tab === tabName);
      });
    }
  };
}