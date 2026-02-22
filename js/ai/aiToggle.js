const STORAGE_KEY = "USS_AI_PANEL_OPEN";

export function initAiToggle() {
  const btn = document.getElementById("aiToggleBtn");
  const panel = document.getElementById("aiPanel");
  const prompt = document.getElementById("aiPrompt");
  const textEl = document.getElementById("aiToggleText");

  if (!btn || !panel) return;

  // ensure closed panels are not taking space on first load
  function applyInitialState(isOpen) {
    panel.classList.toggle("ai-collapsed", !isOpen);
    panel.classList.toggle("ai-gone", !isOpen);

    if (textEl) textEl.textContent = isOpen ? "✖ Close AI" : "✨ Ask AI";
  }

  function setOpen(isOpen) {
    localStorage.setItem(STORAGE_KEY, isOpen ? "1" : "0");

    if (textEl) textEl.textContent = isOpen ? "✖ Close AI" : "✨ Ask AI";

    if (isOpen) {
      // bring it back into layout first
      panel.classList.remove("ai-gone");

      // next frame, animate open
      requestAnimationFrame(() => {
        panel.classList.remove("ai-collapsed");
      });

      if (prompt) setTimeout(() => prompt.focus(), 220);
      return;
    }

    // animate closed
    panel.classList.add("ai-collapsed");

    // after transition, remove from layout
    const onDone = (e) => {
      if (e.target !== panel) return; // only when panel finishes
      panel.classList.add("ai-gone");
      panel.removeEventListener("transitionend", onDone);
    };
    panel.addEventListener("transitionend", onDone);
  }

  function toggle() {
    const isOpen = !panel.classList.contains("ai-collapsed") && !panel.classList.contains("ai-gone");
    setOpen(!isOpen);
  }

  // restore saved state
  const saved = localStorage.getItem(STORAGE_KEY) === "1";
  applyInitialState(saved);

  btn.addEventListener("click", toggle);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}