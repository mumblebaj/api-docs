export function setAiBadgeVisible(visible) {
  const badge = document.getElementById("aiBadge");
  if (!badge) return;
  badge.classList.toggle("hidden", !visible);
}