// js/ui.js

import { runYamlDoctor } from "./yaml-doctor.js";
import { debounce } from "./yaml-utils.js";
import {
  buildOpenApiModel,
  collectAllValidationErrors,
  renderLiveErrors,
} from "./openapi-model.js";

let openApiModel = null;
let liveErrors = [];

export function initUI() {
  const yamlInput = document.getElementById("yamlInput");
  const tipsOutput = document.getElementById("tipsOutput");
  const lessonsOutput = document.getElementById("lessonsOutput");
  const statusBar = document.getElementById("statusBar");
  const doctorBtn = document.getElementById("doctorBtn");
  const toggleLessonsBtn = document.getElementById("toggleLessonsBtn");

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  const runLiveValidation = debounce(() => {
    if (!yamlInput) return;
    openApiModel = buildOpenApiModel(yamlInput.value);
    liveErrors = collectAllValidationErrors(yamlInput.value, openApiModel);
    renderLiveErrors(liveErrors);
  }, 300);

  if (yamlInput) {
    yamlInput.addEventListener("input", runLiveValidation);
  }

  if (doctorBtn) {
    doctorBtn.addEventListener("click", () => {
      if (!yamlInput) return;
      const yaml = yamlInput.value;
      const results = runYamlDoctor(yaml);

      const html = results.length
        ? "<ul>" + results.map((r) => `<li>${r}</li>`).join("") + "</ul>"
        : "<p>✅ No issues detected — YAML looks good!</p>";

      tipsOutput.innerHTML = html;
      switchTab("tips");
      setStatus(statusBar, "YAML Doctor completed");
    });
  }

  if (toggleLessonsBtn) {
    toggleLessonsBtn.addEventListener("click", () => {
      lessonsOutput.innerHTML = "<p>📘 Lessons will be loaded here...</p>";
      switchTab("lessons");
      setStatus(statusBar, "Lessons panel opened");
    });
  }
}

function switchTab(name) {
  document
    .querySelectorAll(".tab")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".tab-pane")
    .forEach((p) => p.classList.remove("active"));

  const tabBtn = document.querySelector(`[data-tab="${name}"]`);
  const tabPane = document.getElementById(`${name}Output`);

  if (tabBtn) tabBtn.classList.add("active");
  if (tabPane) tabPane.classList.add("active");
}

function setStatus(statusBar, msg) {
  if (statusBar) statusBar.textContent = msg;
}
