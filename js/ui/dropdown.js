// js/ui/dropdown.js

export function initExportDropdown(exportMenuBtn, exportDropdown) {
  exportMenuBtn.addEventListener("click", () => {
    exportDropdown.classList.toggle("hidden");
  });

  // Hide when clicking outside
  document.addEventListener("click", (event) => {
    if (
      !exportDropdown.contains(event.target) &&
      !exportMenuBtn.contains(event.target)
    ) {
      exportDropdown.classList.add("hidden");
    }
  });
}
