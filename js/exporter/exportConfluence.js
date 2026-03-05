// js/exporter/exportConfluence.js
// Drop-in Confluence exporter for USS docModel
// - Uses {code}...{code} for any text containing { } placeholders (servers, paths, etc.)
// - Adds anchors + endpoint index (GROUPED BY TAG, TABLE FORMAT)
// - Uses {expand} blocks for request/response examples (and optional headers)

function cfSafe(text) {
  const s = String(text ?? "");
  // Safest rule for Confluence: any braces => wrap in {code}
  if (s.includes("{") || s.includes("}")) return `{code}${s}{code}`;
  return s;
}

// Monospace only for safe tokens (no braces)
function cfMono(text) {
  const s = String(text ?? "");
  if (!s) return "";
  if (s.includes("{") || s.includes("}")) return cfSafe(s);
  return `{{${s}}}`;
}

// For link text in [text|#anchor], keep it simple & safe.
// We keep placeholders visible-ish but avoid brace parsing by stripping braces.
// (Heading below still shows the real path via cfSafe.)
function cfLinkLabel(text) {
  return String(text ?? "").replaceAll("{", "").replaceAll("}", "");
}

// Build stable anchor IDs like: get-payments-uetr-cancellation
function makeEndpointAnchor(method, path, used) {
  const base =
    `${String(method || "").toLowerCase()}-${String(path || "")}`
      .replaceAll("{", "")
      .replaceAll("}", "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "endpoint";

  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  used.add(id);
  return id;
}

// Collapsible section
function cfExpand(title, innerLines) {
  const safeTitle = String(title ?? "Details").replaceAll("\n", " ").trim();
  return [`{expand:title=${safeTitle}}`, ...innerLines, "{expand}"];
}

// JSON code block lines
function cfCodeJson(obj) {
  return ["{code:json}", JSON.stringify(obj, null, 2), "{code}"];
}

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

  // Confluence auto ToC (uses headings)
  lines.push("{toc}");
  lines.push("");

  // ==============================
  // Header
  // ==============================
  lines.push(`h1. ${meta?.title || "OpenAPI Specification"}`);
  lines.push(`*Version:* ${meta?.version || "unversioned"}`);
  if (meta?.openapi) lines.push(`*OpenAPI:* ${meta.openapi}`);
  if (meta?.jsonSchemaDialect) {
    lines.push(`*JSON Schema Dialect (3.1):* ${meta.jsonSchemaDialect}`);
  }
  lines.push(`*Generated:* ${meta?.generatedAt || ""}`);
  lines.push("");

  if (meta?.description) {
    lines.push(meta.description);
    lines.push("");
  }

  if (meta?.termsOfService) lines.push(`*Terms of Service:* ${meta.termsOfService}`);
  if (meta?.contact) lines.push(`*Contact:* ${formatInlineObj(meta.contact)}`);
  if (meta?.license) lines.push(`*License:* ${formatInlineObj(meta.license)}`);
  if (meta?.termsOfService || meta?.contact || meta?.license) lines.push("");

  // ==============================
  // Overview
  // ==============================
  lines.push("h2. Overview");
  lines.push("");
  lines.push(`* Endpoints: ${overview?.totalEndpoints ?? endpoints.length}`);
  lines.push(`* Schemas: ${overview?.totalSchemas ?? schemas.length}`);
  lines.push(`* Enums: ${overview?.totalEnums ?? enums.length}`);
  lines.push(
    `* Security Schemes: ${overview?.totalSecuritySchemes ?? (security?.schemes?.length || 0)}`
  );
  lines.push(
    `* Component Parameters: ${overview?.totalParameters ?? (doc?.components?.parameters?.length || 0)}`
  );
  lines.push(
    `* Component Headers: ${overview?.totalHeaders ?? (doc?.components?.headers?.length || 0)}`
  );
  lines.push("");

  // ==============================
  // Servers
  // ==============================
  if (Array.isArray(servers) && servers.length) {
    lines.push("h2. Servers");
    lines.push("");

    servers.forEach((s, i) => {
      const url = cfSafe(s?.url || "");
      const desc = s?.description ? ` — ${s.description}` : "";
      lines.push(`* *${i + 1}.* ${url}${desc}`);

      if (Array.isArray(s.variables) && s.variables.length) {
        lines.push("** Variables");
        s.variables.forEach((v) => {
          const enumTxt = Array.isArray(v.enum) ? ` (enum: ${v.enum.join(", ")})` : "";
          const def = v.default ?? "";
          lines.push(
            `*** ${cfMono(v.name)} default: ${cfMono(def)}${enumTxt}${
              v.description ? ` — ${v.description}` : ""
            }`
          );
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
      ]
        .filter(Boolean)
        .join(", ");

      lines.push(
        `| ${s.name || ""} | ${s.type || ""} | ${details || ""} | ${s.description || ""} |`
      );

      if (Array.isArray(s.oauth2) && s.oauth2.length) {
        lines.push("");
        lines.push(`*OAuth2 flows for ${s.name}:*`);
        s.oauth2.forEach((f) => {
          lines.push(`* ${cfMono(f.flow)}`);
          if (f.authorizationUrl) lines.push(`** authorizationUrl: ${f.authorizationUrl}`);
          if (f.tokenUrl) lines.push(`** tokenUrl: ${f.tokenUrl}`);
          if (f.refreshUrl) lines.push(`** refreshUrl: ${f.refreshUrl}`);
          if (Array.isArray(f.scopes) && f.scopes.length) {
            lines.push(`** scopes: ${f.scopes.map((x) => cfMono(x)).join(", ")}`);
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
      lines.push(`* ${cfMono(r.scheme)}${scopes}`);
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
    tags.forEach((t) =>
      lines.push(`* *${t.name || ""}*${t.description ? ` — ${t.description}` : ""}`)
    );
    lines.push("");
  }

  if (externalDocs?.url) {
    lines.push("h2. External Documentation");
    lines.push("");
    lines.push(
      `* ${externalDocs.url}${externalDocs.description ? ` — ${externalDocs.description}` : ""}`
    );
    lines.push("");
  }

  // ==============================
  // Endpoints (with anchors)
  // ==============================
  lines.push("h2. Endpoints");
  lines.push("");

  if (!endpoints.length) {
    lines.push("_No endpoints defined._");
    lines.push("");
  } else {
    const usedAnchors = new Set();

    // ---- Group endpoints by tag ----
    const tagOrder = Array.isArray(tags)
      ? tags.map((t) => String(t?.name || "").trim()).filter(Boolean)
      : [];

    const groups = new Map(); // tagName -> endpoints[]
    function addToGroup(tagName, ep) {
      const key = String(tagName || "").trim() || "Untagged";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(ep);
    }

    for (const ep of endpoints) {
      const epTags = Array.isArray(ep?.tags) ? ep.tags.filter(Boolean) : [];
      if (!epTags.length) addToGroup("Untagged", ep);
      else epTags.forEach((t) => addToGroup(t, ep));
    }

    // Sort endpoints inside each tag by path then method
    for (const [k, eps] of groups.entries()) {
      eps.sort((a, b) => {
        const pa = String(a?.path || "");
        const pb = String(b?.path || "");
        if (pa !== pb) return pa.localeCompare(pb);
        const ma = String(a?.method || "").toLowerCase();
        const mb = String(b?.method || "").toLowerCase();
        return ma.localeCompare(mb);
      });
      groups.set(k, eps);
    }

    // Build final ordered tag list: spec tags first, then any others, then Untagged last
    const seen = new Set();
    const orderedTags = [];

    for (const t of tagOrder) {
      if (groups.has(t) && !seen.has(t)) {
        orderedTags.push(t);
        seen.add(t);
      }
    }

    const remaining = Array.from(groups.keys())
      .filter((t) => !seen.has(t) && t !== "Untagged")
      .sort((a, b) => a.localeCompare(b));

    for (const t of remaining) {
      orderedTags.push(t);
      seen.add(t);
    }

    if (groups.has("Untagged")) orderedTags.push("Untagged");

    // ==============================
    // Endpoint Index (Grouped, TABLE)
    // ==============================
    lines.push("h3. Endpoint Index (by tag)");
    lines.push("");

    for (const tagName of orderedTags) {
      const eps = groups.get(tagName) || [];
      if (!eps.length) continue;

      lines.push(`h4. ${tagName}`);
      lines.push("");
      lines.push("|| Method || Path || Summary ||");

      eps.forEach((ep) => {
        const method = String(ep.method || "").toUpperCase();
        const path = String(ep.path || "");
        const anchor = makeEndpointAnchor(method, path, usedAnchors);

        // Link text should be simple and safe (no { } / no {code} inside link text)
        const methodLabel = cfLinkLabel(method);
        const pathLabel = cfLinkLabel(path);

        const methodLink = `[${methodLabel}|#${anchor}]`;
        const pathLink = `[${pathLabel}|#${anchor}]`;
        const summary = ep.summary ? String(ep.summary) : "";

        lines.push(`| ${methodLink} | ${pathLink} | ${summary} |`);
      });

      lines.push("");
    }

    // Reset so anchors used below match index generation exactly
    usedAnchors.clear();

    // ==============================
    // Endpoint Details
    // ==============================
    endpoints.forEach((ep) => {
      const method = String(ep.method || "").toUpperCase();
      const path = String(ep.path || "");
      const anchor = makeEndpointAnchor(method, path, usedAnchors);

      lines.push(`{anchor:${anchor}}`);
      lines.push(`h3. ${method} ${cfSafe(path)}`);

      if (ep.summary) lines.push(`*Summary:* ${ep.summary}`);

      // Long descriptions are nicer collapsed
      if (ep.description) {
        if (String(ep.description).length > 400) {
          lines.push(...cfExpand("Description", [String(ep.description)]));
        } else {
          lines.push(`*Description:* ${ep.description}`);
        }
      }

      if (ep.deprecated) lines.push(`*Deprecated:* yes`);
      lines.push("");

      // Overrides
      if (Array.isArray(ep.servers) && ep.servers.length) {
        lines.push("h4. Servers (override)");
        lines.push("");
        ep.servers.forEach((s) =>
          lines.push(`* ${cfSafe(s.url || "")}${s.description ? ` — ${s.description}` : ""}`)
        );
        lines.push("");
      }

      if (Array.isArray(ep.security) && ep.security.length) {
        lines.push("h4. Security (override)");
        lines.push("");
        ep.security.forEach((r) => {
          const scopes = r.scopes?.length ? ` (scopes: ${r.scopes.join(", ")})` : "";
          lines.push(`* ${cfMono(r.scheme)}${scopes}`);
        });
        lines.push("");
      }

      // Parameters
      if (Array.isArray(ep.parameters) && ep.parameters.length) {
        lines.push("h4. Parameters");
        lines.push("");
        lines.push("|| Name || In || Required || Type || Description ||");

        ep.parameters.forEach((p) => {
          const type = p?.schema?.ref || p?.schema?.type || "";
          lines.push(
            `| ${p.name || ""} | ${p.in || ""} | ${p.required ? "yes" : "no"} | ${cfSafe(type)} | ${
              p.description || ""
            } |`
          );
        });
        lines.push("");
      }

      // Request
      const rb = ep.requestBody || {};
      const reqMedia = Array.isArray(rb.mediaTypes) ? rb.mediaTypes : [];

      if (rb.required != null || rb.description || reqMedia.length || ep.requestBodyExample) {
        lines.push("h4. Request");
        lines.push("");

        if (rb.required != null) lines.push(`*Required:* ${rb.required ? "yes" : "no"}`);
        if (rb.description) lines.push(`*Description:* ${rb.description}`);
        if (reqMedia.length) lines.push(`*Media Types:* ${reqMedia.map((m) => cfMono(m)).join(", ")}`);

        const keysByMedia = rb.exampleKeysByMedia || {};
        const mts = Object.keys(keysByMedia);
        if (mts.length) {
          lines.push("*Examples available:*");
          mts.forEach((mt) => {
            lines.push(`* ${cfMono(mt)}: ${keysByMedia[mt].map((k) => cfMono(k)).join(", ")}`);
          });
        }
        lines.push("");

        if (ep.requestBodyExample) {
          lines.push("h5. Example Request");
          lines.push(...cfExpand("Example Request (JSON)", cfCodeJson(ep.requestBodyExample)));
          lines.push("");
        }
      }

      // Responses
      if (Array.isArray(ep.responses) && ep.responses.length) {
        lines.push("h4. Responses");
        lines.push("");

        ep.responses.forEach((r) => {
          lines.push(`h5. ${r.status}${r.description ? ` — ${r.description}` : ""}`);

          const mts = Array.isArray(r.mediaTypes) ? r.mediaTypes : [];
          if (mts.length) lines.push(`*Media Types:* ${mts.map((m) => cfMono(m)).join(", ")}`);

          const keysByMedia = r.exampleKeysByMedia || {};
          const mtKeys = Object.keys(keysByMedia);
          if (mtKeys.length) {
            lines.push("*Examples available:*");
            mtKeys.forEach((mt) => {
              lines.push(`* ${cfMono(mt)}: ${keysByMedia[mt].map((k) => cfMono(k)).join(", ")}`);
            });
          }

          // Headers can be bulky, so collapse them
          if (Array.isArray(r.headers) && r.headers.length) {
            const headerLines = [];
            headerLines.push("|| Name || Type || Description ||");
            r.headers.forEach((h) => {
              const t = h?.schema?.ref || h?.schema?.type || "";
              headerLines.push(`| ${h.name || ""} | ${cfSafe(t)} | ${h.description || ""} |`);
            });
            lines.push("");
            lines.push(...cfExpand("Headers", headerLines));
          }

          // Response example collapsible
          if (r.example) {
            const mtLabel = mts?.[0] ? ` (${mts[0]})` : "";
            lines.push("");
            lines.push(...cfExpand(`Example Response${mtLabel}`, cfCodeJson(r.example)));
          }

          lines.push("");
        });
      }

      // Schema refs
      const reqRefs = Array.isArray(ep.requestSchemas) ? ep.requestSchemas : [];
      const respRefs = Array.isArray(ep.responseSchemas) ? ep.responseSchemas : [];
      const paramRefs = Array.isArray(ep.parametersSchemas) ? ep.parametersSchemas : [];
      const allRefs = Array.from(new Set([...reqRefs, ...respRefs, ...paramRefs]));
      if (allRefs.length) {
        lines.push(`*Referenced Schemas:* ${allRefs.map((x) => cfMono(x)).join(", ")}`);
        lines.push("");
      }

      lines.push("----");
      lines.push("");
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
        const t = p.ref || p.type || "";
        lines.push(
          `| ${p.name} | ${cfSafe(t)} | ${p.required ? "yes" : "no"} | ${p.description || ""} |`
        );
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
      (en.values || []).forEach((v) => lines.push(`* ${cfMono(v.value)}`));
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

function formatInlineObj(obj) {
  if (!obj || typeof obj !== "object") return "";
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    parts.push(`${k}: ${v}`);
  }
  return parts.join(", ");
}