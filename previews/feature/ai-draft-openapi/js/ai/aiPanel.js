// Uses the toast module (showToast) which is already imported elsewhere.

// js/ai/aiPanel.js
import { draftOpenApi } from "./aiClient.js";
<<<<<<< HEAD
import { getEditorText, setEditorText } from "./editor/editorApi.js";
import { showToast } from "./ui/toast.js";
=======
import { getEditorText, setEditorText } from "../editor/editorApi.js";
import { showToast } from "../ui/toast.js?v=20260221T205233Z";
>>>>>>> fe8ee6441649e1a90e1e43d4ebd0c73b622baa7f
import { setAiBadgeVisible } from "./aiBadge.js";

export function initAiPanel() {
  const promptEl = document.getElementById("aiPrompt");
  const modeEl = document.getElementById("aiMode");
  const genBtn = document.getElementById("aiGenerateBtn");
  const applyBtn = document.getElementById("aiApplyBtn");
  const resultEl = document.getElementById("aiResult");
  const settingsBtn = document.getElementById("aiSettingsBtn");

  // Panel not present on some pages -> safely no-op
  if (!promptEl || !modeEl || !genBtn || !applyBtn || !resultEl) return;

  let latestYaml = "";

  genBtn.addEventListener("click", async () => {
    const prompt = (promptEl.value || "").trim();
    latestYaml = "";
    applyBtn.disabled = true;
    resultEl.textContent = "Generating…";

    if (prompt.length < 10) {
      resultEl.textContent = "Please provide a bit more detail.";
      return;
    }

    const mode = modeEl.value === "patch" ? "patch" : "newDoc";
    const currentYaml = mode === "patch" ? getEditorText() : "";

    try {
      const { yaml } = await draftOpenApi({ prompt, mode, currentYaml });
      latestYaml = yaml.trim();
      resultEl.textContent = latestYaml;
      applyBtn.disabled = !latestYaml;
      setAiBadgeVisible(!!latestYaml);
      showToast("✅ Draft generated");
    } catch (e) {
      resultEl.textContent = `Error: ${e.message || e}`;
      showToast(`❌ AI Draft failed: ${e.message || e}`);
    }
  });

  applyBtn.addEventListener("click", () => {
    if (!latestYaml) return;
    setEditorText(latestYaml);
    applyBtn.disabled = true;
    setAiBadgeVisible(false);
    showToast("✅ Applied AI draft to editor");
  });

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      const current = localStorage.getItem("USS_AI_ENDPOINT") || "";
      const next = prompt(
        "Set AI Gateway Endpoint (leave blank to use default /api/ai/draft-openapi):",
        current
      );
      if (next === null) return;

      const trimmed = next.trim();
      if (!trimmed) {
        localStorage.removeItem("USS_AI_ENDPOINT");
        showToast("ℹ️ Using default AI endpoint");
      } else {
        localStorage.setItem("USS_AI_ENDPOINT", trimmed);
        showToast("✅ AI endpoint saved");
      }
    });
  }
}