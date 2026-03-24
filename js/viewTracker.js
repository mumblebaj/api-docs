// viewTracker.js — Universal Schema Studio usage tracker
// Created by mumblebaj + GPT-5 — patched for nested paths

(function () {
  const app = "universal-schema-studio";

  // ---------------------------------------------
  // 🔍 Auto-detect and normalize the page slug
  // ---------------------------------------------
  const rawPath = window.location.pathname
    .replace(/^\/|\/$/g, "")    // remove leading/trailing slashes
    .replace(/\.html$/, "")     // remove ".html"
    || "yamlxsdViewer";         // default at root

  // If the path contains nested folders, convert:
  // tutor/index   → tutor-index
  // openapi/editor → openapi-editor
  let slug = rawPath.replace(/\//g, "-");

  // Optional: Friendly name overrides (clean analytics)
  const friendly = {
    "tutor-index": "tutor",
    "docs-index": "uss",
    "openapiEditor-index": "openapi-editor",
    "xsdStudio-index": "xsd-studio",
  };

  slug = friendly[slug] || slug;

  // ---------------------------------------------
  // 🔗 Build API URL
  // ---------------------------------------------
  const apiUrl = `https://api.mumblebaj.xyz/increment/${app}/${slug}`;

  // ---------------------------------------------
  // 🧠 Avoid double-counting per tab/session
  // ---------------------------------------------
  const sessionKey = `uss-tracked-${slug}`;
  if (sessionStorage.getItem(sessionKey)) return;

  // ---------------------------------------------
  // 🚀 Fire-and-forget tracker call
  // ---------------------------------------------
  fetch(apiUrl, { method: "GET", mode: "no-cors" })
    .then(() => console.log(`📊 Viewing ${slug}`))
    .catch(() =>
      console.warn(`⚠️ View-Counter offline or unreachable for ${slug}`)
    );

  sessionStorage.setItem(sessionKey, "true");
})();
