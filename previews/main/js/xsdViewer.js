// Created by mumblebaj

// js/xsdViewer.js
// async function ensureReDocLoaded() {
//   if (window.Redoc) return;
//   await new Promise((resolve, reject) => {
//     const s = document.createElement("script");
//     s.src = "https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js";
//     s.onload = resolve;
//     s.onerror = reject;
//     document.head.appendChild(s);
//   });
// }

function isTrustedScriptSrc(src) {
  // allow same-origin absolute paths
  if (src.startsWith("/")) return true;

  // allow known CDNs only
  return (
    src.startsWith("https://cdn.jsdelivr.net/") ||
    src.startsWith("https://cdnjs.cloudflare.com/") ||
    src.startsWith("https://unpkg.com/")
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (!isTrustedScriptSrc(src)) {
      reject(new Error(`[USS] Blocked untrusted script src: ${src}`));
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed: ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureReDocLoaded() {
  if (window.Redoc) return;

  const cdn =
    "https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.min.js";

  // ✅ No location-derived path building — just try both deployments
  const localCandidates = [
    "/vendor/redoc/redoc.standalone.min.js", // custom domain
    "/api-docs/vendor/redoc/redoc.standalone.min.js", // GitHub Pages
  ];

  try {
    await loadScript(cdn);
  } catch (err) {
    console.warn("[USS] ReDoc CDN failed, trying local fallbacks...", err);

    let lastErr = null;
    for (const local of localCandidates) {
      try {
        await loadScript(local);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
  }

  if (!window.Redoc) {
    throw new Error("ReDoc failed to load from both CDN and local fallbacks.");
  }
}

/**
 * Initializes the XSD → OpenAPI viewer logic inside your unified index.html.
 */
export function initXsdViewer(dropzone, yamlViewer, xsdViewer) {
  console.log("🧩 XSD Viewer initialized");

  yamlViewer.style.display = "none";
  xsdViewer.style.display = "block";

  /* ---------- helpers ---------- */
  const stripNs = (s) => (s || "").replace(/^.*:/, "");

  function mdDocs(node, shallowOnly = false) {
    if (!node) return "";
    const docs = shallowOnly
      ? node.querySelectorAll(
          ":scope > xs\\:annotation > xs\\:documentation, :scope > annotation > documentation",
        )
      : node.querySelectorAll("xs\\:documentation, documentation");

    let out = "";
    docs.forEach((d) => {
      const src = d.getAttribute("source");
      const text = (d.textContent || "").trim();
      if (text) out += src ? `**${src}:** ${text}\n\n` : text + "\n\n";
    });

    out = out
      .replace(/\n{3,}/g, "\n\n")
      .replace(/(\*\*Name:\*\*.*\n\n\*\*Definition:\*\*[\s\S]+?)\n\n\1/g, "$1")
      .replace(/(\*\*Definition:\*\*[\s\S]+?)\n\n\1/g, "$1");

    return out.trim();
  }

  function mapXsdType(t) {
    const base = stripNs(t).toLowerCase();
    switch (base) {
      case "boolean":
        return { type: "boolean" };
      case "decimal":
      case "double":
      case "float":
      case "integer":
      case "int":
      case "long":
      case "short":
        return { type: "number" };
      case "date":
        return { type: "string", format: "date" };
      case "datetime":
        return { type: "string", format: "date-time" };
      default:
        return { type: "string" };
    }
  }

  /* ---------- drag & drop ---------- */
  dropzone.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xsd, text/xml";
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

  /* ---------- main processor ---------- */
  async function handleFile(file) {
    const text = await file.text();
    const xml = new DOMParser().parseFromString(text, "application/xml");
    const baseName = file.name.replace(/\.[^.]+$/, "");

    const complexTypes = {};
    xml.querySelectorAll("xs\\:complexType, complexType").forEach((ct) => {
      const name = ct.getAttribute("name");
      if (name) complexTypes[name] = ct;
    });
    const simpleTypes = {};
    xml.querySelectorAll("xs\\:simpleType, simpleType").forEach((st) => {
      const name = st.getAttribute("name");
      if (name) simpleTypes[name] = st;
    });

    const components = { schemas: {} };

    // ✅ order-safe registrars
    function ensureSimple(name) {
      if (!name || components.schemas[name]) return;
      const st = simpleTypes[name];
      if (!st) return;
      const sch = buildSimpleTypeSchema(st);
      const d = mdDocs(st, true);
      if (d) sch.description = d;
      components.schemas[name] = sch;
    }

    function ensureComplex(name) {
      if (!name || components.schemas[name]) return;
      const ct = complexTypes[name];
      if (ct) {
        const sch = buildComplexTypeSchema(ct);
        components.schemas[name] = sch;
      } else {
        ensureSimple(name);
      }
    }

    // ===========================
    // SIMPLE TYPE BUILDER (PATCHED)
    // ===========================
    function buildSimpleTypeSchema(st) {
      const schema = { type: "string" };

      const restriction = st.querySelector("xs\\:restriction, restriction");
      if (restriction) {
        const base = restriction.getAttribute("base");
        if (base) Object.assign(schema, mapXsdType(base));

        // Track numeric facets for proper combined behavior
        let numeric = {
          minInclusive: null,
          maxInclusive: null,
          minExclusive: null,
          maxExclusive: null,
          totalDigits: null,
          fractionDigits: null,
        };

        restriction.querySelectorAll(":scope > *").forEach((f) => {
          const val = f.getAttribute("value");

          switch (f.localName) {
            /* STRING FACETS --------------------- */
            case "pattern":
              schema.pattern = val;
              break;

            case "maxLength":
              schema.maxLength = +val;
              break;

            case "minLength":
              schema.minLength = +val;
              break;

            case "length":
              schema.minLength = +val;
              schema.maxLength = +val;
              break;

            case "enumeration":
              if (!schema.enum) schema.enum = [];
              schema.enum.push(val);
              break;

            /* NUMERIC FACETS --------------------- */
            case "minInclusive":
              numeric.minInclusive = +val;
              break;

            case "maxInclusive":
              numeric.maxInclusive = +val;
              break;

            case "minExclusive":
              numeric.minExclusive = +val;
              break;

            case "maxExclusive":
              numeric.maxExclusive = +val;
              break;

            case "fractionDigits":
              numeric.fractionDigits = +val;
              break;

            case "totalDigits":
              numeric.totalDigits = +val;
              break;
          }
        });

        /* Apply numeric facets ------------------ */
        if (numeric.minInclusive !== null) {
          schema.minimum = numeric.minInclusive;
        }
        if (numeric.maxInclusive !== null) {
          schema.maximum = numeric.maxInclusive;
        }
        if (numeric.minExclusive !== null) {
          schema.minimum = numeric.minExclusive;
          schema.exclusiveMinimum = true;
        }
        if (numeric.maxExclusive !== null) {
          schema.maximum = numeric.maxExclusive;
          schema.exclusiveMaximum = true;
        }

        /* fractionDigits only ------------------ */
        if (numeric.fractionDigits !== null && numeric.totalDigits === null) {
          const fd = numeric.fractionDigits;
          schema.pattern = `^-?\\\\d+(?:\\\\.\\\\d{1,${fd}})?$`;
        }

        /* totalDigits only ---------------------- */
        if (numeric.totalDigits !== null && numeric.fractionDigits === null) {
          const td = numeric.totalDigits;
          schema.pattern = `^-?\\\\d{1,${td}}(?:\\\\.\\\\d{1,${td}})?$`;
        }

        /* Combined totalDigits + fractionDigits (ISO20022 accurate) */
        if (numeric.totalDigits !== null && numeric.fractionDigits !== null) {
          const td = numeric.totalDigits;
          const fd = numeric.fractionDigits;
          const intMax = td - fd;
          schema.pattern = `^-?\\\\d{1,${intMax}}(?:\\\\.\\\\d{1,${fd}})?$`;
        }
      }

      return schema;
    }

    function ensureSimple(name) {
      if (!name || components.schemas[name]) return;
      const st = simpleTypes[name];
      if (!st) return;
      const sch = buildSimpleTypeSchema(st);
      const d = mdDocs(st, true);
      if (d) sch.description = d;
      components.schemas[name] = sch;
    }

    function buildElementSchema(el) {
      const typeAttr = el.getAttribute("type");
      const maxOccurs = el.getAttribute("maxOccurs");
      const inlineCT = el.querySelector("xs\\:complexType, complexType");
      const inlineST = el.querySelector("xs\\:simpleType, simpleType");

      let baseSchema;
      if (typeAttr) {
        const typeName = stripNs(typeAttr);
        const elName = el.getAttribute("name");
        const isSelf = elName && elName === typeName;

        if (!isSelf) {
          if (complexTypes[typeName]) {
            ensureComplex(typeName);
            baseSchema = { $ref: `#/components/schemas/${typeName}` };
          } else if (simpleTypes[typeName]) {
            ensureSimple(typeName);
            baseSchema = { $ref: `#/components/schemas/${typeName}` };
          } else {
            baseSchema = mapXsdType(typeAttr);
          }
        } else {
          const ct = complexTypes[typeName];
          const st = simpleTypes[typeName];
          if (ct) baseSchema = buildComplexTypeSchema(ct);
          else if (st) baseSchema = buildSimpleTypeSchema(st);
          else baseSchema = { type: "string" };
        }
      } else if (inlineCT) baseSchema = buildComplexTypeSchema(inlineCT);
      else if (inlineST) baseSchema = buildSimpleTypeSchema(inlineST);
      else baseSchema = { type: "string" };

      const annDocs = el.querySelector(
        ":scope > xs\\:annotation, :scope > annotation",
      );
      const docsText = mdDocs(annDocs, true);
      if (docsText) {
        baseSchema.description =
          docsText +
          (baseSchema.description ? "\n\n" + baseSchema.description : "");
      } else if (baseSchema.$ref) delete baseSchema.description;

      if (maxOccurs && maxOccurs !== "1")
        baseSchema = { type: "array", items: baseSchema };

      const minOccurs = el.getAttribute("minOccurs");
      if (minOccurs && parseInt(minOccurs) > 0) baseSchema._isRequired = true;

      return baseSchema;
    }

    function buildComplexTypeSchema(ct) {
      const schema = { type: "object", properties: {}, required: [] };
      const seq = ct.querySelector(":scope > xs\\:sequence, :scope > sequence");
      const choice = ct.querySelector(":scope > xs\\:choice, :scope > choice");
      const simpleContent = ct.querySelector(
        ":scope > xs\\:simpleContent, :scope > simpleContent",
      );

      if (seq) {
        for (const n of seq.children) {
          if (/choice$/i.test(n.localName)) {
            // 🧭 Nested choice inside sequence
            const oneOfSchemas = [];
            for (const c of n.children) {
              if (!/element$/i.test(c.localName)) continue;
              const cname = c.getAttribute("name");
              if (!cname) continue;
              const childSchema = buildElementSchema(c);

              const branch = {
                type: "object",
                properties: { [cname]: childSchema },
                required: childSchema._isRequired ? [cname] : undefined,
              };
              oneOfSchemas.push(branch);
            }
            if (oneOfSchemas.length > 0) schema.oneOf = oneOfSchemas;
          } else if (/element$/i.test(n.localName)) {
            // Regular element
            const name = n.getAttribute("name");
            if (!name) continue;
            const childSchema = buildElementSchema(n);
            schema.properties[name] = childSchema;
            if (childSchema._isRequired) schema.required.push(name);
            delete childSchema._isRequired;
          }
        }
      } else if (choice) {
        // Handle XSD <choice> as OpenAPI oneOf
        const oneOfSchemas = [];
        for (const n of choice.children) {
          if (!/element$/i.test(n.localName)) continue;
          const name = n.getAttribute("name");
          if (!name) continue;
          const childSchema = buildElementSchema(n);

          // Each choice branch becomes a oneOf option
          const branch = {
            type: "object",
            properties: { [name]: childSchema },
            required: childSchema._isRequired ? [name] : undefined,
          };
          oneOfSchemas.push(branch);
        }
        if (oneOfSchemas.length > 0) schema.oneOf = oneOfSchemas;
      } else if (simpleContent) {
        const ext = simpleContent.querySelector("xs\\:extension, extension");
        if (ext) {
          const baseName = stripNs(ext.getAttribute("base"));

          // --- Text content (the "value" node)
          let valueSchema;
          if (simpleTypes[baseName]) {
            ensureSimple(baseName);
            valueSchema = { $ref: `#/components/schemas/${baseName}` };
          } else if (complexTypes[baseName]) {
            ensureComplex(baseName);
            valueSchema = { $ref: `#/components/schemas/${baseName}` };
          } else {
            valueSchema = mapXsdType(baseName);
          }

          schema.properties = {};
          schema.properties.value = {
            ...valueSchema,
            description: "*(text content)*",
          };
          schema.required = ["value"];

          // --- Collect attributes
          const attrs = [];
          ext.querySelectorAll("xs\\:attribute, attribute").forEach((attr) => {
            const attrName = attr.getAttribute("name");
            if (!attrName) return;

            const attrSchema = buildElementSchema(attr);
            const attrDocs = mdDocs(attr, true);
            const markedDesc = attrDocs
              ? `*(XML attribute)* ${attrDocs}`
              : "*(XML attribute)*";

            attrSchema.description = attrSchema.description
              ? `${markedDesc}\n\n${attrSchema.description}`
              : markedDesc;

            const wrappedName = `@${attrName}`;
            attrs.push([wrappedName, attrSchema]);

            const use = attr.getAttribute("use");
            if (use === "required") schema.required.push(wrappedName);
          });

          const ordered = {};
          ordered.value = schema.properties.value;
          for (const [n, s] of attrs) ordered[n] = s;
          schema.properties = ordered;
        }
      }

      if (Object.keys(schema.properties).length === 0) delete schema.properties;
      if (schema.required.length === 0) delete schema.required;

      // ✅ Fix for pure oneOf types
      if (schema.oneOf && !schema.properties) {
        delete schema.type;
      }

      const typeDocs = mdDocs(ct, true);
      if (typeDocs) schema.description = typeDocs;

      return schema;
    }

    // 🧭 Dynamically detect root element(s)
    const schemaEl = xml.querySelector("xs\\:schema, schema");
    let rootEl = null;

    if (schemaEl) {
      // ✅ Namespace-safe element detection (works with xs:, xsd:, or no prefix)
      const rootCandidates = Array.from(schemaEl.children).filter(
        (el) => el.localName === "element",
      );

      if (rootCandidates.length > 0) {
        // Prefer known wrappers, else first
        rootEl =
          rootCandidates.find((el) => el.getAttribute("name") === "Document") ||
          rootCandidates.find((el) => el.getAttribute("name") === "AppHdr") ||
          rootCandidates[0];

        // If multiple, create dropdown
        if (rootCandidates.length > 1) {
          const selector = document.createElement("select");
          selector.id = "rootSelector";
          selector.style.margin = "10px 0";
          selector.style.padding = "4px 6px";
          selector.style.borderRadius = "6px";
          selector.style.fontSize = "14px";
          selector.style.cursor = "pointer";

          rootCandidates.forEach((el) => {
            const name = el.getAttribute("name");
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = `Root: ${name}`;
            if (el === rootEl) opt.selected = true;
            selector.appendChild(opt);
          });

          const viewerHeader =
            document.querySelector("#xsd-viewer-header") || document.body;
          viewerHeader.insertBefore(selector, viewerHeader.firstChild);

          selector.addEventListener("change", (e) => {
            const chosen = rootCandidates.find(
              (el) => el.getAttribute("name") === e.target.value,
            );
            if (chosen) {
              rootEl = chosen;
              console.log(
                "🔄 Root element changed to:",
                rootEl.getAttribute("name"),
              );
              // Rebuild + re-render Redoc (same as before)
              const chosenName = rootEl.getAttribute("name");
              const chosenSchema = buildElementSchema(rootEl);
              components.schemas[chosenName] = chosenSchema;
              components.schemas[`${chosenName}Root`] = {
                type: "object",
                properties: {
                  [chosenName]: { $ref: `#/components/schemas/${chosenName}` },
                },
              };
              const updatedOpenApi = {
                ...openapi,
                info: { ...openapi.info, title: chosenName },
                components,
                paths: {
                  ["/" + chosenName]: {
                    post: {
                      summary: `XSD Schema: ${chosenName}`,
                      requestBody: {
                        content: {
                          "application/xml": {
                            schema: {
                              $ref: `#/components/schemas/${chosenName}Root`,
                            },
                          },
                        },
                      },
                      responses: {
                        200: {
                          description: "Schema generated successfully",
                          content: {
                            "application/json": {
                              schema: {
                                $ref: `#/components/schemas/${chosenName}Root`,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              };
              safeRenderRedoc(updatedOpenApi, redocThemes[currentTheme]);
            }
          });
        }
      } else {
        console.warn("⚠️ No top-level elements found in XSD.");
      }
    } else {
      console.error("❌ No <xs:schema> element found in XSD.");
    }

    if (rootEl)
      console.log("✅ Root element detected:", rootEl.getAttribute("name"));

    const rootName = rootEl?.getAttribute("name");
    const rootSchema = buildElementSchema(rootEl);
    components.schemas[rootName] = rootSchema;
    components.schemas[`${rootName}Root`] = {
      type: "object",
      properties: { [rootName]: { $ref: `#/components/schemas/${rootName}` } },
    };

    const fileDesc = mdDocs(rootEl, true) || "Auto-generated from XSD";

    const openapi = {
      openapi: "3.0.3",
      info: { title: baseName, version: "1.0.0", description: fileDesc },
      components,
      paths: {
        ["/" + baseName]: {
          post: {
            summary: `XSD Schema: ${baseName}`,
            requestBody: {
              content: {
                "application/xml": {
                  schema: { $ref: `#/components/schemas/${rootName}Root` },
                },
              },
            },
            responses: {
              200: {
                description: "Schema generated successfully",
                content: {
                  "application/json": {
                    schema: { $ref: `#/components/schemas/${rootName}Root` },
                  },
                },
              },
            },
          },
        },
      },
    };

    // --- Helper: safely render Redoc with theme awareness
    async function safeRenderRedoc(openapi, theme) {
      await ensureReDocLoaded();

      const viewer = document.getElementById("xsd-viewer");
      if (!viewer || !viewer.parentNode) {
        console.warn("⚠️ xsd-viewer not found or detached; skipping render");
        return;
      }

      viewer.innerHTML = "";
      try {
        Redoc.init(openapi, { theme }, viewer);
      } catch (err) {
        console.error("❌ Redoc initialization failed:", err);
      }
    }

    // --- Define Redoc themes
    const redocThemes = {
      light: {
        colors: {
          text: { primary: "#000000", secondary: "#555555" },
          background: { main: "#ffffff" },
          primary: { main: "#0d6efd" },
        },
      },
      dark: {
        colors: {
          text: { primary: "#e0e0e0", secondary: "#aaaaaa" },
          background: { main: "#1e1e1e" },
          primary: { main: "#3399ff" },
        },
      },
    };

    const currentTheme = document.documentElement.dataset.theme || "light";

    // console.log("🧾 Generated OpenAPI JSON:", JSON.stringify(openapi, null, 2));

    await safeRenderRedoc(openapi, redocThemes[currentTheme]);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-theme") {
          const newTheme = document.documentElement.dataset.theme || "light";
          console.log(`🌓 Theme changed → re-rendering Redoc (${newTheme})`);
          safeRenderRedoc(openapi, redocThemes[newTheme]);
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
  }
}
