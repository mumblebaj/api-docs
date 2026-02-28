// Uses the toast module (showToast) which is already imported elsewhere.
// Fixes required for path resolution

// js/ai/aiPanel.js
import { draftOpenApi, AiAuthError } from "./aiClient.js?v=20260228T182737Z";
import {
  getEditorText,
  setEditorText,
} from "../editor/editorApi.js?v=20260228T182737Z";
import { showToast } from "../ui/toast.js?v=20260228T182737Z";
import { setAiBadgeVisible } from "./aiBadge.js?v=20260228T182737Z";

export function initAiPanel() {
  const promptEl = document.getElementById("aiPrompt");
  const modeEl = document.getElementById("aiMode");
  const genBtn = document.getElementById("aiGenerateBtn");
  const applyBtn = document.getElementById("aiApplyBtn");
  const settingsBtn = document.getElementById("aiSettingsBtn");
  // AI Result Modal elements
  const modal = document.getElementById("aiResultModal");
  const modalPre = document.getElementById("aiResultPre");
  const modalClose = document.getElementById("aiResultClose");
  const modalCopy = document.getElementById("aiResultCopy");
  const modalApply = document.getElementById("aiResultApply");

  function openAiResultModal(yaml) {
    if (!modal || !modalPre || !modalApply) return;
    modalPre.textContent = yaml || "";
    modalApply.disabled = !yaml;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeAiResultModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  modalClose?.addEventListener("click", closeAiResultModal);
  modal?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closeAiResultModal();
  });

  modalCopy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(modalPre?.textContent || "");
      showToast("✅ Copied to clipboard");
    } catch {
      showToast("❌ Copy failed", "error");
    }
  });

  modalApply?.addEventListener("click", () => {
    const yaml = modalPre?.textContent || "";
    if (!yaml) return;
    setEditorText(yaml);
    // collapse panel after successful apply (same as you already do)
    const panel = document.getElementById("aiPanel") || document.querySelector(".ai-panel");
    panel?.classList.add("ai-collapsed", "ai-gone");
    setAiBadgeVisible(false);
    showToast("✅ Applied AI draft to editor");
    closeAiResultModal();
    promptEl.value = "";
  });

  // Panel not present on some pages -> safely no-op.
  if (!promptEl || !modeEl || !genBtn) return;

  let latestYaml = "";

  function showAuthToast(isCorporate = false) {
    if (isCorporate) {
      showToast(
        "🔒 Your organization’s AI gateway rejected the request (401/403). Please sign in via your corporate gateway.",
        "warning",
      );
      return;
    }

    const wrap = document.createElement("div");
    wrap.append(
      "🔒 AI drafting requires sign-in. Open this link to sign in via Google SSO. ",
    );

    const a = document.createElement("a");
    a.href = "https://schema.mumblebaj.xyz/api/ai/draft-openapi";
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Sign in / Register";
    a.style.marginLeft = "6px";

    wrap.appendChild(a);
    showToast(wrap, "warning");
  }

  genBtn.addEventListener("click", async () => {
    const prompt = (promptEl.value || "").trim();
    latestYaml = "";
    applyBtn.disabled = true;
    showToast("⏳ Generating…", "info");

    if (prompt.length < 10) {
      showToast("Please provide a bit more detail.", "warning");
      return;
    }

    const mode = modeEl.value === "patch" ? "patch" : "newDoc";
    const currentYaml = mode === "patch" ? getEditorText() : "";

    try {
      const { yaml } = await draftOpenApi({ prompt, mode, currentYaml });
      latestYaml = yaml.trim();

      // applyBtn.disabled = !latestYaml;
      setAiBadgeVisible(!!latestYaml);
      openAiResultModal(latestYaml);
      showToast("✅ Draft generated");
    } catch (e) {
      if (e?.name === "AiAuthError") {
        showAuthToast(!!e.isCorporate);
        return;
      }

      showToast(`❌ AI Draft failed: ${e.message || e}`, "error");
    }
  });

  applyBtn.addEventListener("click", () => {
    if (!latestYaml) return;
    setEditorText(latestYaml);
    // close panel after successful apply
    const panel =
    document.getElementById("aiPanel") || document.querySelector(".ai-panel");
    panel?.classList.add("ai-collapsed", "ai-gone");
    applyBtn.disabled = true;
    setAiBadgeVisible(false);
    showToast("✅ Applied AI draft to editor");
    promptEl.value = "";
  });

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      const current = localStorage.getItem("USS_AI_ENDPOINT") || "";
      const next = prompt(
        "Set AI Gateway Endpoint (leave blank to use default /api/ai/draft-openapi):",
        current,
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
