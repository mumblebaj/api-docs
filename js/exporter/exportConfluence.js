// js/exporter/exportConfluence.js

export function exportConfluence(doc) {
  const lines = [];

  const {
    meta,
    overview,
    servers = [],
    security = { global: [], schemes: [] },
    tags = [],
    externalDocs = null,
    endpoints = [],
    schemas = [],
    enums = [],
  } = doc || {};

  // ==============================
  // ToC - Table of Contents (guarded)
  // ==============================
  lines.push("h2. Table of Contents");
  lines.push("");

  const tocSections = doc?.toc?.sections?.length
    ? doc.toc.sections
    : buildFallbackToc({ endpoints, schemas, enums });

  tocSections.forEach((sec) => {
    lines.push(`* ${sec.title}`);
    if (sec.children && sec.children.length) {
      sec.children.forEach((child) => {
        lines.push(`** ${child.title}`);
      });
    }
  });
  lines.push("");

  // ==============================
  // Header
  // ==============================
  lines.push(`h1. ${meta?.title || "OpenAPI Specification"}`);
  lines.push(`*Version:* ${meta?.version || "unversioned"}`);
  if (meta?.openapi) lines.push(`*OpenAPI:* ${meta.openapi}`);
  if (meta?.jsonSchemaDialect)
    lines.push(`*JSON Schema Dialect (3.1):* ${meta.jsonSchemaDialect}`);
  lines.push(`*Generated:* ${meta?.generatedAt || ""}`);
  lines.push("");

  if (meta?.description) {
    lines.push(meta.description);
    lines.push("");
  }

  if (meta?.termsOfService) lines.push(`*Terms of Service:* ${meta.termsOfService}`, "");
  if (meta?.contact) lines.push(`*Contact:* ${formatInlineObj(meta.contact)}`, "");
  if (meta?.license) lines.push(`*License:* ${formatInlineObj(meta.license)}`, "");

  // ==============================
  // Overview
  // ==============================
  lines.push("h2. Overview");
  lines.push("");
  lines.push(`* Endpoints: ${overview?.totalEndpoints ?? endpoints.length}`);
  lines.push(`* Schemas: ${overview?.totalSchemas ?? schemas.length}`);
  lines.push(`* Enums: ${overview?.totalEnums ?? enums.length}`);
  lines.push(`* Security Schemes: ${overview?.totalSecuritySchemes ?? (security?.schemes?.length || 0)}`);
  lines.push(`* Component Parameters: ${overview?.totalParameters ?? (doc?.components?.parameters?.length || 0)}`);
  lines.push(`* Component Headers: ${overview?.totalHeaders ?? (doc?.components?.headers?.length || 0)}`);
  lines.push("");

  // ==============================
  // Servers
  // ==============================
  if (Array.isArray(servers) && servers.length) {
    lines.push("h2. Servers");
    lines.push("");
    servers.forEach((s, i) => {
      lines.push(`* *${i + 1}.* {{${s.url}}}${s.description ? ` — ${s.description}` : ""}`);
      if (Array.isArray(s.variables) && s.variables.length) {
        lines.push("** Variables:");
        s.variables.forEach((v) => {
          const enumTxt = Array.isArray(v.enum) ? ` (enum: ${v.enum.join(", ")})` : "";
          lines.push(`*** {{${v.name}}} default: {{${v.default}}}${enumTxt}${v.description ? ` — ${v.description}` : ""}`);
        });
      }
    });
    lines.push("");
  }

  // ==============================
  // Security
  // ==============================
  lines.push("h2. Security");
  lines.push("");

  const schemes = Array.isArray(security?.schemes) ? security.schemes : [];
  if (schemes.length) {
    lines.push("h3. Security Schemes");
    lines.push("");
    lines.push("|| Name || Type || Details || Description ||");

    schemes.forEach((s) => {
      const details = [
        s.in ? `in=${s.in}` : null,
        s.scheme ? `scheme=${s.scheme}` : null,
        s.bearerFormat ? `bearerFormat=${s.bearerFormat}` : null,
        s.openIdConnectUrl ? `oidc=${s.openIdConnectUrl}` : null,
      ].filter(Boolean).join(", ");

      lines.push(`| ${s.name || ""} | ${s.type || ""} | ${details || ""} | ${s.description || ""} |`);

      // Pretty oauth2 flows (if docModel included it)
      if (Array.isArray(s.oauth2) && s.oauth2.length) {
        lines.push("");
        lines.push(`*OAuth2 flows for ${s.name}:*`);
        s.oauth2.forEach((f) => {
          lines.push(`* {{${f.flow}}}`);
          if (f.authorizationUrl) lines.push(`** authorizationUrl: ${f.authorizationUrl}`);
          if (f.tokenUrl) lines.push(`** tokenUrl: ${f.tokenUrl}`);
          if (f.refreshUrl) lines.push(`** refreshUrl: ${f.refreshUrl}`);
          if (Array.isArray(f.scopes) && f.scopes.length) {
            lines.push(`** scopes: ${f.scopes.map((x) => `{{${x}}}`).join(", ")}`);
          }
        });
        lines.push("");
      }
    });

    lines.push("");
  }

  const globalReqs = Array.isArray(security?.global) ? security.global : [];
  if (globalReqs.length) {
    lines.push("h3. Global Security Requirements");
    lines.push("");
    globalReqs.forEach((r) => {
      const scopes = r.scopes?.length ? ` (scopes: ${r.scopes.join(", ")})` : "";
      lines.push(`* {{${r.scheme}}}${scopes}`);
    });
    lines.push("");
  } else {
    lines.push("_No global security requirements declared._");
    lines.push("");
  }

  // ==============================
  // Tags + External Docs
  // ==============================
  if (Array.isArray(tags) && tags.length) {
    lines.push("h2. Tags");
    lines.push("");
    tags.forEach((t) => lines.push(`* *${t.name || ""}*${t.description ? ` — ${t.description}` : ""}`));
    lines.push("");
  }

  if (externalDocs?.url) {
    lines.push("h2. External Documentation");
    lines.push("");
    lines.push(`* ${externalDocs.url}${externalDocs.description ? ` — ${externalDocs.description}` : ""}`);
    lines.push("");
  }

  // ==============================
  // Endpoints
  // ==============================
  lines.push("h2. Endpoints");
  lines.push("");

  if (!endpoints.length) {
    lines.push("_No endpoints defined._");
    lines.push("");
  } else {
    endpoints.forEach((ep, i) => {
      const title = ep.isWebhook
        ? `Webhook ${String(ep.method || "").toUpperCase()} ${ep.path || ""}`
        : `${String(ep.method || "").toUpperCase()} ${ep.path || ""}`;

      lines.push(`h3. ${i + 1}. ${title}`);
      if (ep.summary) lines.push(`* Summary: ${ep.summary}`);
      if (ep.description) lines.push(`* Description: ${ep.description}`);
      if (ep.deprecated) lines.push(`* Deprecated: yes`);
      lines.push("");

      // Endpoint server override
      if (Array.isArray(ep.servers) && ep.servers.length) {
        lines.push("*Servers (override):*");
        ep.servers.forEach((s) => lines.push(`* {{${s.url}}}${s.description ? ` — ${s.description}` : ""}`));
        lines.push("");
      }

      // Endpoint security override
      if (Array.isArray(ep.security) && ep.security.length) {
        lines.push("*Security (override):*");
        ep.security.forEach((r) => {
          const scopes = r.scopes?.length ? ` (scopes: ${r.scopes.join(", ")})` : "";
          lines.push(`* {{${r.scheme}}}${scopes}`);
        });
        lines.push("");
      }

      // Parameters
      if (Array.isArray(ep.parameters) && ep.parameters.length) {
        lines.push("*Parameters:*");
        lines.push("|| Name || In || Required || Type || Description ||");
        ep.parameters.forEach((p) => {
          const type = p?.schema?.ref ? `ref: ${p.schema.ref}` : (p?.schema?.type || "");
          lines.push(`| ${p.name || ""} | ${p.in || ""} | ${p.required ? "yes" : "no"} | ${type} | ${p.description || ""} |`);
        });
        lines.push("");
      }

      // Request body meta
      const rb = ep.requestBody || {};
      const reqMedia = Array.isArray(rb.mediaTypes) ? rb.mediaTypes : [];
      if (rb.required != null || rb.description || reqMedia.length) {
        lines.push("*Request Body:*");
        if (rb.required != null) lines.push(`* required: *${rb.required ? "yes" : "no"}*`);
        if (rb.description) lines.push(`* description: ${rb.description}`);
        if (reqMedia.length) lines.push(`* media types: ${reqMedia.map((m) => `{{${m}}}`).join(", ")}`);

        const keysByMedia = rb.exampleKeysByMedia || {};
        const mts = Object.keys(keysByMedia);
        if (mts.length) {
          lines.push(`* examples available:`);
          mts.forEach((mt) => {
            lines.push(`** {{${mt}}}: ${keysByMedia[mt].map((k) => `{{${k}}}`).join(", ")}`);
          });
        }
        lines.push("");
      }

      // Best request example
      if (ep.requestBodyExample) {
        lines.push("*Example Request (best):*");
        lines.push("{code:json}");
        lines.push(JSON.stringify(ep.requestBodyExample, null, 2));
        lines.push("{code}");
        lines.push("");
      }

      // Responses
      if (Array.isArray(ep.responses) && ep.responses.length) {
        lines.push("*Responses:*");
        ep.responses.forEach((r) => {
          lines.push(`* *${r.status}* — ${r.description || ""}`);

          const mts = Array.isArray(r.mediaTypes) ? r.mediaTypes : [];
          if (mts.length) lines.push(`** media types: ${mts.map((m) => `{{${m}}}`).join(", ")}`);

          const keysByMedia = r.exampleKeysByMedia || {};
          const mtKeys = Object.keys(keysByMedia);
          if (mtKeys.length) {
            lines.push(`** examples available:`);
            mtKeys.forEach((mt) => {
              lines.push(`*** {{${mt}}}: ${keysByMedia[mt].map((k) => `{{${k}}}`).join(", ")}`);
            });
          }

          // Response headers
          if (Array.isArray(r.headers) && r.headers.length) {
            lines.push(`** headers:`);
            r.headers.forEach((h) => {
              const t = h?.schema?.ref ? `ref: ${h.schema.ref}` : (h?.schema?.type || "");
              lines.push(`*** {{${h.name}}}${t ? ` ({{${t}}})` : ""}${h.description ? ` — ${h.description}` : ""}`);
            });
          }

          // Best response example
          if (r.example) {
            lines.push("{code:json}");
            lines.push(JSON.stringify(r.example, null, 2));
            lines.push("{code}");
          }
        });
        lines.push("");
      }

      // Schema refs (helpful for completeness)
      const reqRefs = Array.isArray(ep.requestSchemas) ? ep.requestSchemas : [];
      const respRefs = Array.isArray(ep.responseSchemas) ? ep.responseSchemas : [];
      const paramRefs = Array.isArray(ep.parametersSchemas) ? ep.parametersSchemas : [];
      const allRefs = Array.from(new Set([...reqRefs, ...respRefs, ...paramRefs]));
      if (allRefs.length) {
        lines.push(`*Referenced Schemas:* ${allRefs.map((x) => `{{${x}}}`).join(", ")}`);
        lines.push("");
      }
    });
  }

  // ==============================
  // Schemas
  // ==============================
  lines.push("h2. Schemas");
  lines.push("");

  schemas.forEach((s) => {
    lines.push(`h3. ${s.name}`);
    if (s.description) lines.push(s.description);
    if (s.schemaDialect) lines.push(`*$schema:* ${s.schemaDialect}`);
    lines.push("");

    if (Array.isArray(s.properties) && s.properties.length) {
      lines.push("|| Property || Type || Required || Description ||");
      s.properties.forEach((p) => {
        const t = p.ref ? `ref: ${p.ref}` : (p.type || "");
        lines.push(`| ${p.name} | ${t} | ${p.required ? "yes" : "no"} | ${p.description || ""} |`);
      });
      lines.push("");
    }
    lines.push("");
  });

  // ==============================
  // Enums
  // ==============================
  lines.push("h2. Enums");
  lines.push("");

  if (!enums.length) {
    lines.push("_No enums defined._");
    lines.push("");
  } else {
    enums.forEach((en) => {
      lines.push(`h3. ${en.name}`);
      if (en.description) lines.push(en.description);
      lines.push("");
      (en.values || []).forEach((v) => lines.push(`* {{${v.value}}}`));
      lines.push("");
    });
  }

  // ==============================
  // Footer Attribution
  // ==============================
  lines.push("");
  lines.push("----");
  lines.push("Documentation generated by *Universal Schema Studio*");
  lines.push("https://schema.mumblebaj.xyz");

  return lines.join("\n");
}

function buildFallbackToc({ endpoints = [], schemas = [], enums = [] }) {
  return [
    { title: "Overview" },
    {
      title: "Endpoints",
      children: endpoints.map((ep) => ({
        title: `${String(ep.method || "").toUpperCase()} ${ep.path || ""}`,
      })),
    },
    { title: "Schemas", children: schemas.map((s) => ({ title: s.name })) },
    { title: "Enums", children: enums.map((e) => ({ title: e.name })) },
  ];
}

function formatInlineObj(obj) {
  if (!obj || typeof obj !== "object") return "";
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    parts.push(`${k}: ${v}`);
  }
  return parts.join(", ");
}