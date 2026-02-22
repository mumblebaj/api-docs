// js/ui/toast.js

const DEFAULT_DURATION = 10000; // 10 seconds feels right

export function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // remove after delay
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => container.removeChild(toast), 300);
  }, DEFAULT_DURATION);
}
