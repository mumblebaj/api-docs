// js/openapi-model.js

import { runYamlDoctor } from "./yaml-doctor.js";

// Generic parser for $ref paths: "#/components/<section>/<name>[/...]"
export function parseRef(refPath) {
  if (!refPath || typeof refPath !== "string") return null;

  const trimmed = refPath.replace(/^#\//, "");
  const parts = trimmed.split("/");

  if (parts.length < 2) {
    console.warn("Invalid $ref path:", refPath);
    return null;
  }

  const root = parts[0];   // "components"
  const section = parts[1]; // "schemas", "responses", ...
  const name = parts[2] || null;

  return { root, section, name, parts };
}

// Returns true if "#/components/<section>/<name>" exists in the OpenAPI model
export function refExistsInModel(refPath, model) {
  if (!model) return false;

  const ref = parseRef(refPath);
  if (!ref) return false;

  const { root, section, name } = ref;

  if (root !== "components" || !section || !name) return false;

  const components = model.components || {};
  const sectionMap = components[section];

  if (!sectionMap || typeof sectionMap !== "object") return false;

  return Object.prototype.hasOwnProperty.call(sectionMap, name);
}

export function buildOpenApiModel(yamlText) {
  let json;
  try {
    json = YAML.parse(yamlText);
  } catch (e) {
    return null;
  }

  if (!json || typeof json !== "object") return null;

  const model = {
    schemas: {},
    refs: [],
    components: json.components || {},
  };

  if (
    json.components &&
    json.components.schemas &&
    typeof json.components.schemas === "object"
  ) {
    for (const key of Object.keys(json.components.schemas)) {
      model.schemas[key] = json.components.schemas[key];
    }
  }

  function scan(obj, path = "") {
    if (!obj || typeof obj !== "object") return;

    if (obj.$ref && typeof obj.$ref === "string") {
      model.refs.push({
        ref: obj.$ref,
        path,
      });
    }

    for (const k of Object.keys(obj)) {
      scan(obj[k], path + "/" + k);
    }
  }

  scan(json);

  return model;
}

export function validateOpenApiStructure(json) {
  const out = [];

  if (!json.openapi) {
    out.push({
      severity: "error",
      message: "Missing required 'openapi:' version field.",
    });
  }

  if (!json.info) {
    out.push({
      severity: "error",
      message: "Missing required 'info:' section.",
    });
  }

  if (!json.paths) {
    out.push({
      severity: "error",
      message: "Missing required 'paths:' section.",
    });
  }

  if (!json.components || !json.components.schemas) {
    out.push({
      severity: "warning",
      message: "No schemas found under components.schemas.",
    });
  }

  return out;
}

export function validateOpenApiRefs(model) {
  const out = [];
  if (!model) return out;

  for (const r of model.refs) {
    const ref = r.ref;
    if (ref.startsWith("#/components/schemas/")) {
      const schemaName = ref.split("/").pop();
      if (!model.schemas[schemaName]) {
        out.push({
          severity: "error",
          message: `Schema '${schemaName}' referenced but not defined.`,
        });
      }
    }
  }

  return out;
}

export function validateOpenApiTypes(json) {
  const out = [];

  function walk(obj, path = "") {
    if (!obj || typeof obj !== "object") return;

    if (obj.type === "array" && !obj.items) {
      out.push({
        severity: "warning",
        message: `Array at '${path}' is missing required 'items:' definition.`,
      });
    }

    const valid = [
      "string",
      "number",
      "integer",
      "boolean",
      "array",
      "object",
    ];
    if (obj.type && !valid.includes(obj.type)) {
      out.push({
        severity: "warning",
        message: `Unknown OpenAPI type '${obj.type}' at '${path}'.`,
      });
    }

    for (const key of Object.keys(obj)) {
      walk(obj[key], `${path}/${key}`);
    }
  }

  walk(json);
  return out;
}

export function openApiExplain(line, hierarchy, model) {
  if (!model) return "";

  const trimmed = line.trim();
  if (!trimmed.startsWith("$ref:")) return "";

  const ref = trimmed.replace("$ref:", "").trim().replace(/['"]/g, "");

  let md = `
---
### 🔗 Reference Check
**Reference:** \`${ref}\`
`;

  const exists = refExistsInModel(ref, model);

  if (exists) {
    md += `\n✔️ _Reference is valid._\n`;
  } else {
    md += `\n❌ **Schema does not exist in \`components.schemas\`.**\n`;
  }

  return md;
}

export function collectAllValidationErrors(yamlText, model) {
  const errors = [];

  let json = null;
  try {
    json = YAML.parse(yamlText);
  } catch (e) {
    errors.push({
      severity: "error",
      message: "YAML Parsing Error: " + e.message,
      line: e.mark ? e.mark.line + 1 : null,
    });
    return errors;
  }

  const yamlIssues = runYamlDoctor(yamlText);
  for (const msg of yamlIssues) {
    errors.push({
      severity: "warning",
      message: msg,
    });
  }

  errors.push(...validateOpenApiStructure(json));
  errors.push(...validateOpenApiRefs(model));
  errors.push(...validateOpenApiTypes(json));

  return errors;
}

// Simple renderer that writes into #doctorOutput
export function renderLiveErrors(errors) {
  const doctorOutput = document.getElementById("doctorOutput");
  if (!doctorOutput) return;

  if (!errors.length) {
    doctorOutput.innerHTML =
      "<div style='color:green;'>✔ No issues detected.</div>";
    return;
  }

  const grouped = {
    error: [],
    warning: [],
    info: [],
  };

  errors.forEach((e) => {
    const sev = e.severity || "info";
    if (!grouped[sev]) grouped[sev] = [];
    grouped[sev].push(e);
  });

  let html = "";

  if (grouped.error.length) {
    html += "<h3 style='color:#e74c3c;'>Errors</h3><ul>";
    for (const e of grouped.error) {
      html += `<li>❌ ${e.message}</li>`;
    }
    html += "</ul>";
  }

  if (grouped.warning.length) {
    html += "<h3 style='color:#f39c12;'>Warnings</h3><ul>";
    for (const e of grouped.warning) {
      html += `<li>⚠️ ${e.message}</li>`;
    }
    html += "</ul>";
  }

  if (grouped.info.length) {
    html += "<h3 style='color:#3498db;'>Info</h3><ul>";
    for (const e of grouped.info) {
      html += `<li>ℹ️ ${e.message}</li>`;
    }
    html += "</ul>";
  }

  doctorOutput.innerHTML = html;
}
