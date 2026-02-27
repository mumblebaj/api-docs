function pageBasePath() {
  // directory of current page, e.g.
  // /docs/openapiEditor.html -> /docs/
  // /api-docs/openapiEditor.html -> /api-docs/
  console.log(location.pathname)
  return location.pathname.replace(/\/[^/]*$/, "/");
}

function isTrustedScriptSrc(src) {
  // allow jsdelivr + same-origin URLs
  try {
    const u = new URL(src, location.href);
    return (
      u.href.startsWith("https://cdn.jsdelivr.net/") ||
      u.origin === location.origin
    );
  } catch {
    return false;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (!isTrustedScriptSrc(src)) {
      reject(new Error(`[USS] Blocked untrusted script src: ${src}`));
      return;
    }

    // If already present, don't inject twice
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      console.log("[USS] Script tag already present:", src);
      // If it already loaded, resolve; otherwise wait for load/error
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed: ${src}`)),
        { once: true },
      );
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;

    const timer = setTimeout(() => {
      reject(new Error(`[USS] Timed out loading: ${src}`));
    }, 12000);

    s.addEventListener(
      "load",
      () => {
        clearTimeout(timer);
        s.dataset.loaded = "1";
        console.log("[USS] Script loaded:", src);
        resolve();
      },
      { once: true },
    );

    s.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        console.warn("[USS] Script failed:", src);
        reject(new Error(`Failed: ${src}`));
      },
      { once: true },
    );

    console.log("[USS] Injecting script:", src);
    document.head.appendChild(s);
  });
}

export async function ensureReDocLoaded() {
  // ✅ stronger guard
  if (window.Redoc && typeof window.Redoc.init === "function") return;

  // Optional: if you keep the CDN script tag, you can just wait briefly
  // for it to finish loading rather than injecting anything.
  await waitForRedocGlobal(2000);

  if (window.Redoc && typeof window.Redoc.init === "function") return;

  // If still missing, THEN try dynamic injection (AMD-safe)
  // ... your fallback loader ...
}

function waitForRedocGlobal(timeoutMs = 2000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (window.Redoc && typeof window.Redoc.init === "function") return resolve();
      if (Date.now() - start > timeoutMs) return resolve();
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export async function renderRedocPreview(spec, parentEl) {
  await ensureReDocLoaded();

  const newContainer = document.createElement("div");
  newContainer.id = "redoc-container-" + Date.now();
  parentEl.appendChild(newContainer);

  try {
    window.Redoc.init(
      spec,
      {
        hideDownloadButton: true,
        scrollYOffset: 50,
        theme: {
          colors: { primary: { main: "#61affe" } },
          typography: { fontSize: "14px" },
        },
      },
      newContainer,
    );

    // ✅ cleanup old containers (FIXED spread operator)
    setTimeout(() => {
      [...parentEl.children].forEach((child) => {
        if (child !== newContainer) parentEl.removeChild(child);
      });
    }, 250);
  } catch (err) {
    console.error("❌ ReDoc.init error:", err);
    throw err;
  }
}
