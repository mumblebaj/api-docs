// js/schemaExport/schemaExportModal.js

import {
  createSelectionState,
  applyUserSelection,
  applyUserDeselection,
  getFinalSelection,
  getDependencyCount,
} from "./selectionUtils.js";

import { buildSchemaDependencyMap } from "./dependencyResolver.js";

export function initSchemaExportModal({
  editor,
  buildDocModel,
  showToast,
  handleExportMarkdown,
  handleExportConfluence,
}) {
  const schemaExportModal = document.getElementById("schemaExportModal");
  const schemaCheckboxContainer = document.getElementById(
    "schemaCheckboxContainer"
  );
  const cancelSchemaExportBtn = document.getElementById("cancelSchemaExport");
  const confirmSchemaExportBtn = document.getElementById("confirmSchemaExport");

  let selectionState = createSelectionState();
  let finalSelectedSchemas = [];
  let currentSchemaExportMode = null;

  function resetSchemaExportState() {
    selectionState = createSelectionState();
    finalSelectedSchemas = [];
    schemaCheckboxContainer.innerHTML = "";
    currentSchemaExportMode = null;

    const summaryEl = document.getElementById("dependencySummary");
    if (summaryEl) summaryEl.classList.add("hidden");

    updateConfirmButtonState();
  }

  function closeSchemaExportModal() {
    schemaExportModal.classList.add("hidden");
    resetSchemaExportState();
  }

  function updateConfirmButtonState() {
    confirmSchemaExportBtn.disabled =
      !selectionState.userSelected.size &&
      !selectionState.autoSelected.size;
  }

  function updateDependencySummary() {
    const el = document.getElementById("dependencySummary");
    if (!el) return;

    const count = getDependencyCount(selectionState);
    if (!count) {
      el.classList.add("hidden");
      return;
    }

    el.textContent = `This export will include ${count} ${
      count === 1 ? "dependency" : "dependencies"
    }.`;
    el.classList.remove("hidden");
  }

  function updateSchemaCheckboxStates() {
    schemaCheckboxContainer
      .querySelectorAll(".schema-row")
      .forEach((row) => {
        const cb = row.querySelector("input[type='checkbox']");
        const badge = row.querySelector(".schema-badge");
        const name = cb.value;

        if (selectionState.userSelected.has(name)) {
          cb.checked = true;
          badge.classList.add("hidden");
        } else if (selectionState.autoSelected.has(name)) {
          cb.checked = true;
          badge.classList.remove("hidden");
        } else {
          cb.checked = false;
          badge.classList.add("hidden");
        }
      });
  }

  function openSchemaExportModal(mode) {
    resetSchemaExportState();
    currentSchemaExportMode = mode;

    try {
      const yamlText = editor.getValue();
      const spec = YAML.parse(yamlText);
      const doc = buildDocModel(spec);
      const dependencyMap = buildSchemaDependencyMap(
        doc.schemaDependencies || {}
      );

      schemaCheckboxContainer.innerHTML = "";

      doc.schemas
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((schema) => {
          const label = document.createElement("label");
          label.className = "schema-row";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = schema.name;

          const span = document.createElement("span");
          span.textContent = schema.name;

          const badge = document.createElement("span");
          badge.className = "schema-badge hidden";
          badge.textContent = "auto";

          const name = schema.name;

          cb.addEventListener("change", () => {
            if (cb.checked) {
              applyUserSelection(
                selectionState,
                name,
                dependencyMap[name] || []
              );
            } else {
              applyUserDeselection(selectionState, name, dependencyMap);
            }

            updateSchemaCheckboxStates();
            updateDependencySummary();
            updateConfirmButtonState();
          });

          label.append(cb, span, badge);
          schemaCheckboxContainer.appendChild(label);
        });

      schemaExportModal.classList.remove("hidden");
    } catch (err) {
      console.error("Failed to prepare selective export:", err);
      showToast("❌ Fix YAML before selective export.");
      currentSchemaExportMode = null;
    }
  }

  cancelSchemaExportBtn.addEventListener("click", closeSchemaExportModal);

  confirmSchemaExportBtn.addEventListener("click", () => {
    finalSelectedSchemas = getFinalSelection(selectionState);
    if (!finalSelectedSchemas.length) return;

    if (currentSchemaExportMode === "markdown") {
      handleExportMarkdown(true, finalSelectedSchemas);
    } else {
      handleExportConfluence(true, finalSelectedSchemas);
    }

    closeSchemaExportModal();
  });

  return {
    openSchemaExportModal,
  };
}
