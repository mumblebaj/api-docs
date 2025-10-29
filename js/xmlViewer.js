// js/xmlViewer.js — Created by mumblebaj + GPT-5

// --- Utilities --------------------------------------------------------------

function setStatus(msg, ok = true) {
  const el = document.getElementById("xmlStatus");
  el.textContent = msg || "";
  el.style.color = ok ? "var(--ok-green, #28a745)" : "var(--error-red, #ff6b6b)";
}

function ensureReDocLoaded() {
  if (window.Redoc) return Promise.resolve();
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js";
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

// --- Reliable XML→JSON converter for all fast-xml-parser builds ---
async function ensureFXP() {
  // If already loaded, return immediately
  if (
    window.fxparser ||
    window.fastXmlParser ||
    window.FastXMLParser ||
    window.fxp ||
    window.XMLParser
  ) {
    return;
  }

  // Otherwise, load dynamically
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/fast-xml-parser/5.2.5/fxparser.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load fast-xml-parser"));
    document.head.appendChild(s);
  });
}

async function parseXmlToJson(xmlText) {
  await ensureFXP();

  // detect the global
  let fx =
    window.fxparser ||
    window.fastXmlParser ||
    window.FastXMLParser ||
    window.fxp ||
    window.XMLParser;

  // handle default wrapper (e.g., fxparser.default.XMLParser)
  if (fx && fx.default) fx = fx.default;

  if (!fx) throw new Error("fast-xml-parser not available after load.");

  const opts = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    trimValues: true,
    parseTagValue: true,
    parseAttributeValue: true,
  };

  // 1️⃣ simple function form (fx.parse)
  if (typeof fx.parse === "function") {
    return fx.parse(xmlText, opts);
  }

  // 2️⃣ namespace with .XMLParser
  if (fx.XMLParser && typeof fx.XMLParser === "function") {
    const parser = new fx.XMLParser(opts);
    return parser.parse(xmlText);
  }

  // 3️⃣ direct constructor/function fallback
  if (typeof fx === "function") {
    try {
      const parser = new fx(opts);
      if (parser.parse) return parser.parse(xmlText);
    } catch {
      // fallback to callable function style
      return fx(xmlText, opts);
    }
  }

  throw new Error(
    "Unsupported fast-xml-parser global shape. Found keys: " +
      Object.keys(fx).join(", ")
  );
}

// Optional: quick diagnostic in console on load
(function logFXPVariant() {
  const fxp = ensureFXP();
  if (!fxp) {
    console.warn("fast-xml-parser not found. Ensure the script tag loads BEFORE xmlViewer.js.");
    return;
    }
  console.info("fast-xml-parser detected:", fxp.kind,
    fxp.ns ? `(ns keys: ${Object.keys(fxp.ns).join(", ")})` : "");
})();

function getXmlFromInputs() {
  // Prefer file content if a file was chosen; otherwise use pasted text
  const fileInput = document.getElementById("xmlFileInput");
  const textArea = document.getElementById("xmlTextarea");
  return (async () => {
    if (fileInput.files && fileInput.files[0]) {
      return await fileInput.files[0].text();
    }
    return textArea.value.trim();
  })();
}

function resetInputs() {
  document.getElementById("xmlFileInput").value = "";
  document.getElementById("xmlTextarea").value = "";
  setStatus("");
  document.getElementById("xmlPreview").innerHTML = "";
  window.__convertedJson = undefined;
}

// Build a minimal OpenAPI spec that shows the converted JSON as a response example.
// Using an example ensures ReDoc presents the object nicely even without a full schema inference pass.
function createMockSpecFromJson(jsonData) {
  return {
    openapi: "3.0.0",
    info: {
      title: "Converted XML Message",
      version: "1.0.0",
      description:
        "This is your XML message, converted to JSON for readable browsing.",
    },
    paths: {
      "/xml-message": {
        get: {
          summary: "Converted XML → JSON",
          responses: {
            200: {
              description: "Converted XML content",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true,
                    // Put the whole object as an example so ReDoc renders it beautifully
                    example: jsonData,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

// --- Main actions -----------------------------------------------------------

async function handleView() {
  try {
    setStatus("Parsing XML...", true);
    const xml = await getXmlFromInputs();
    if (!xml) {
      setStatus("Please choose a file or paste XML first.", false);
      return;
    }

    // Parse
    const jsonData = await parseXmlToJson(xml);

    // Render via ReDoc mock spec
    const spec = createMockSpecFromJson(jsonData);
    await ensureReDocLoaded();

    const preview = document.getElementById("xmlPreview");
    preview.innerHTML = "";
    window.Redoc.init(spec, { scrollYOffset: 20 }, preview);

    window.__convertedJson = jsonData;
    setStatus("✅ XML parsed and rendered.");
  } catch (err) {
    console.error(err);
    setStatus("❌ Error parsing XML. Please ensure it's valid.", false);
  }
}

function handleDownloadJson() {
  if (!window.__convertedJson) {
    setStatus("No JSON to download yet. Parse an XML first.", false);
    return;
  }
  const blob = new Blob([JSON.stringify(window.__convertedJson, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "converted-xml.json";
  link.click();
}

// --- Dropzone wiring (matches your schema viewer) ---------------------------

function wireDropzone() {
  const dz = document.getElementById("xmlDropzone");
  const fileInput = document.getElementById("xmlFileInput");

  const openFilePicker = () => fileInput.click();

  // Click-to-open
  dz.addEventListener("click", openFilePicker);
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  });

  // Forward manual selection
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      setStatus(`Selected: ${fileInput.files[0].name}`);
    }
  });

  // Drag & drop styling
  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dz.classList.remove("dragover");
    })
  );

  // Drop handler
  dz.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      document.getElementById("xmlTextarea").value = ""; // prefer file if dropped
      fileInput.files = e.dataTransfer.files;
      setStatus(`Dropped: ${file.name}`);
    }
  });
}

// --- Theme toggle (reuse your existing pattern) -----------------------------

function wireThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  toggle.addEventListener("click", () => {
    const html = document.documentElement;
    const theme = html.getAttribute("data-theme") === "light" ? "dark" : "light";
    html.setAttribute("data-theme", theme);
    toggle.textContent = theme === "light" ? "🌞 / 🌙" : "🌙 / 🌞";
  });
}

// --- Init ------------------------------------------------------------------

function init() {
  wireDropzone();
  wireThemeToggle();
  document.getElementById("viewBtn").addEventListener("click", handleView);
  document.getElementById("downloadJsonBtn").addEventListener("click", handleDownloadJson);
  document.getElementById("clearBtn").addEventListener("click", resetInputs);
}

init();
