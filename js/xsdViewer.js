// Created by mumblebaj

// js/xsdViewer.js
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
 * Initializes the XSD → OpenAPI viewer logic inside your unified index.html.
 * @param {HTMLElement} dropzone - The dropzone element for file drag/drop.
 * @param {HTMLElement} yamlViewer - The YAML/JSON viewer container.
 * @param {HTMLElement} xsdViewer - The XSD/ReDoc viewer container.
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
          ":scope > xs\\:annotation > xs\\:documentation, :scope > annotation > documentation"
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

    function buildSimpleTypeSchema(st) {
      const schema = { type: "string" };
      const restriction = st.querySelector("xs\\:restriction, restriction");
      if (restriction) {
        const base = restriction.getAttribute("base");
        if (base) Object.assign(schema, mapXsdType(base));
        restriction.querySelectorAll(":scope > *").forEach((f) => {
          const val = f.getAttribute("value");
          switch (f.localName) {
            case "pattern":
              schema.pattern = val;
              break;
            case "maxLength":
              schema.maxLength = +val;
              break;
            case "minLength":
              schema.minLength = +val;
              break;
          }
        });
      }
      return schema;
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
        ":scope > xs\\:annotation, :scope > annotation"
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
        ":scope > xs\\:simpleContent, :scope > simpleContent"
      );

      if (seq || choice) {
        const children = (seq || choice).children;
        for (const n of children) {
          if (!/element$/i.test(n.localName)) continue;
          const name = n.getAttribute("name");
          if (!name) continue;
          const childSchema = buildElementSchema(n);
          schema.properties[name] = childSchema;
          if (childSchema._isRequired) schema.required.push(name);
          delete childSchema._isRequired;
        }
      }
      // 🔧 FIX: model <simpleContent> (e.g., CBPR_Amount__1) as an object with a "value" prop + attributes
      else if (simpleContent) {
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

          // --- Collect attributes first
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

          // --- Add attributes first, then value, then others (for consistent ReDoc ordering)
          const ordered = {};
          // First text value
          ordered.value = schema.properties.value;
          // Then attributes
          for (const [n, s] of attrs) ordered[n] = s;

          schema.properties = ordered;
        }
      }

      if (schema.properties && Object.keys(schema.properties).length === 0)
        delete schema.properties;
      if (schema.required && schema.required.length === 0)
        delete schema.required;

      // Only attach docs once to avoid double Name/Definition
      const typeDocs = mdDocs(ct, true);
      if (typeDocs) schema.description = typeDocs;

      return schema;
    }

    // --- Document root ---
    const docRoot = xml.querySelector(
      ":scope > xs\\:element[name='Document'], :scope > element[name='Document']"
    );
    if (!docRoot) {
      alert("No <Document> element found in XSD.");
      return;
    }

    const documentSchema = buildElementSchema(docRoot);
    components.schemas["Document"] = documentSchema;
    components.schemas["DocumentRoot"] = {
      type: "object",
      properties: { Document: { $ref: "#/components/schemas/Document" } },
    };

    const fileDesc = mdDocs(docRoot, true) || "Auto-generated from XSD";

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
                  schema: { $ref: "#/components/schemas/DocumentRoot" },
                },
              },
            },
            responses: {
              200: {
                description: "Schema generated successfully",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/DocumentRoot" },
                  },
                },
              },
            },
          },
        },
      },
    };

    const fresh = xsdViewer.cloneNode(false);
    xsdViewer.parentNode.replaceChild(fresh, xsdViewer);
    await ensureReDocLoaded();
    Redoc.init(openapi, {}, fresh);
  }
}
