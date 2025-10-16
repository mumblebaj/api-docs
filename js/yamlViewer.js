// js/yamlViewer.js

async function ensureReDocLoaded() {
  if (window.Redoc) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Initializes the YAML / JSON schema viewer.
 * @param {HTMLElement} dropzone - The file dropzone element.
 * @param {HTMLElement} yamlViewer - The YAML viewer container.
 * @param {HTMLElement} xsdViewer - The XSD viewer container.
 */
export function initYamlViewer(dropzone, yamlViewer, xsdViewer) {
  console.log("📘 YAML/JSON Viewer initialized");

  xsdViewer.style.display = "none";
  yamlViewer.style.display = "block";

  yamlViewer.innerHTML = `
    <div id="viewer-header" style="text-align:center;margin-top:1rem;">
      <h3>YAML / JSON Schema Viewer</h3>
      <p>Drop a .yaml, .yml, or .json file to view its structure</p>
    </div>
    <div id="yaml-redoc" style="height:75vh; overflow:auto; border-radius:8px;"></div>
    <pre id="yaml-output" style="background:#f7f7f7; color:#222; padding:1rem; border-radius:8px; overflow:auto; max-height:75vh; display:none;"></pre>
  `;

  const output = yamlViewer.querySelector("#yaml-output");
  const redocContainer = yamlViewer.querySelector("#yaml-redoc");

  /* ---------- drag & drop ---------- */
  dropzone.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".yaml,.yml,.json";
    input.onchange = (e) => handleFile(e.target.files[0]);
    input.click();
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  /* ---------- parser & renderer ---------- */
  async function handleFile(file) {
    const text = await file.text();
    let data;

    // Load js-yaml if needed
    if (typeof window.jsyaml === "undefined") {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    // Parse YAML or JSON
    try {
      data = window.jsyaml.load(text);
    } catch (e) {
      try {
        data = JSON.parse(text);
      } catch {
        output.style.display = "block";
        output.textContent = "❌ Invalid YAML or JSON file.";
        redocContainer.style.display = "none";
        return;
      }
    }

    // Detect OpenAPI spec
    const isOpenAPI = data && (data.openapi || data.swagger);

    if (isOpenAPI) {
      console.log("🧾 Detected OpenAPI schema — rendering with Redoc");
      await ensureReDocLoaded();

      // Recreate container
      const fresh = redocContainer.cloneNode(false);
      redocContainer.parentNode.replaceChild(fresh, redocContainer);

      // Render with Redoc
      Redoc.init(data, {}, fresh);

      output.style.display = "none";
      fresh.style.display = "block";
    } else {
      console.log("📄 Plain YAML/JSON detected — rendering collapsible tree");
      output.innerHTML = "";
      redocContainer.style.display = "none";
      output.style.display = "block";
      renderCollapsible(output, data);
    }
  }

  /* ---------- collapsible viewer ---------- */
  function renderCollapsible(container, data, depth = 0) {
    const wrapper = document.createElement("div");
    wrapper.style.marginLeft = `${depth * 1.2}rem`;

    if (typeof data === "object" && data !== null) {
      for (const key in data) {
        const value = data[key];
        const item = document.createElement("div");

        if (typeof value === "object" && value !== null) {
          const toggle = document.createElement("span");
          toggle.textContent = "▶";
          toggle.style.cursor = "pointer";
          toggle.style.marginRight = "4px";

          const keyLabel = document.createElement("strong");
          keyLabel.textContent = key;

          const sub = document.createElement("div");
          sub.style.display = "none";
          sub.style.marginLeft = "1rem";
          renderCollapsible(sub, value, depth + 1);

          toggle.onclick = () => {
            const open = sub.style.display === "block";
            sub.style.display = open ? "none" : "block";
            toggle.textContent = open ? "▶" : "▼";
          };

          item.appendChild(toggle);
          item.appendChild(keyLabel);
          item.appendChild(sub);
        } else {
          item.innerHTML = `<strong>${key}:</strong> <span>${escapeHtml(value)}</span>`;
        }

        wrapper.appendChild(item);
      }
    } else {
      wrapper.textContent = escapeHtml(String(data));
    }

    container.appendChild(wrapper);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
