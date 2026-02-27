export function debounce(fn, delay = 1200, statusEl) {
  let timer;
  return (...args) => {
    clearTimeout(timer);

    if (statusEl) {
      statusEl.textContent = "⏳ Validating...";
      statusEl.style.color = "#ffb400";
    }

    timer = setTimeout(async () => {
      try {
        await fn(...args);
      } catch (err) {
        console.error("Debounced function error:", err);
      }
    }, delay);
  };
}