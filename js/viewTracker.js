// viewTracker.js — Universal Schema Studio usage tracker
// Created by mumblebaj + GPT-5

(function () {
  const app = "universal-schema-studio";

  // 🔍 Auto-detect the page slug from the current path
  const path = window.location.pathname
    .replace(/^\/|\/$/g, "")   // remove leading/trailing slashes
    .replace(/\.html$/, "")    // remove ".html" if present
    || "yamlxsdViewer";                // default if at root

  const slug = path || "index";
  const apiUrl = `https://api.mumblebaj.xyz/increment/${app}/${slug}`;

  // 🧠 Prevent multiple increments per tab/session
  const sessionKey = `uss-tracked-${slug}`;
  if (sessionStorage.getItem(sessionKey)) return;

  // 🚀 Fire-and-forget tracker call (no delay, no blocking)
  fetch(apiUrl, { method: "GET", mode: "no-cors" })
    .then(() => console.log(`📊 Viewing ${slug}`))
    .catch(() => console.warn("⚠️ View-Counter offline or unreachable"));

  sessionStorage.setItem(sessionKey, "true");
})();
