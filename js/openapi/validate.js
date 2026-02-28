import { fetchJsonWithFallbacks } from "../utils/fetch.js";
import {
  assertSecuritySchemesDefined,
  assertServerVariablesShape,
} from "./semantic.js";
import { collectExternalRefs, collectUnresolvedInternalRefs } from "./refs.js";

/**
 * USS OpenAPI validation (Phase 1: Dual-mode + pinned schema-base)
 *
 *  - OpenAPI 3.0.x: Ajv v6 + @apidevtools/openapi-schemas@2.1.0 + Draft-04 meta (existing behavior preserved)
 *  - OpenAPI 3.1.x: Ajv v8 + pinned schema-base (registry HTML-wrapped JSON supported via fetchJsonWithFallbacks)
 *  - OpenAPI 3.2.x: Ajv v8 + pinned schema-base
 *
 * Vendored-first:
 *  - Put local copies under /vendor/openapi/ (recommended for GH Pages stability)
 *  - This file will try local first, then pinned spec.openapis.org URLs.
 */

let __ajvValidate30 = null;
let __ajvValidate31 = null;
let __ajvValidate32 = null;

// -------------------------
// Version detection
// -------------------------
function detectOasMajorMinor(spec) {
  const v = String(spec?.openapi ?? "").trim();
  if (v.startsWith("3.2")) return "3.2";
  if (v.startsWith("3.1")) return "3.1";
  return "3.0";
}

// -------------------------
// Ajv error normalization
// -------------------------
function normalizeAjvError(e) {
  return {
    code: e?.keyword || "AJV_ERROR",
    message: e?.message || "Schema validation error",
    // Ajv v8: instancePath. Ajv v6: dataPath (or instancePath in some configs)
    path: e?.instancePath || e?.dataPath || "/",
    details: e,
  };
}

// -------------------------
// Pinned registry URLs (confirmed)
// -------------------------
//
// NOTE: registry pages are browsed as .html but the internal $id/$ref targets omit .html.
// We normalize URIs by stripping trailing ".html" before mapping/resolution.
//
const PINNED = {
  3.1: {
    schemaBase: "https://spec.openapis.org/oas/3.1/schema-base/2025-11-23.html",
    schema: "https://spec.openapis.org/oas/3.1/schema/2025-11-23.html",
    dialect: "https://spec.openapis.org/oas/3.1/dialect/2024-11-10.html",
  },
  3.2: {
    schemaBase: "https://spec.openapis.org/oas/3.2/schema-base/2025-11-23.html",
    schema: "https://spec.openapis.org/oas/3.2/schema/2025-11-23.html",
    // schema-base pins dialect const to 2025-09-17 (per your snippet)
    dialect: "https://spec.openapis.org/oas/3.2/dialect/2025-09-17.html",
  },
};

// -------------------------
// Vendored local paths (recommended)
// -------------------------
const VENDORED = {
  3.1: {
    schemaBase: [
      "/vendor/openapi/oas-3.1.schema-base.json",
      "/api-docs/vendor/openapi/oas-3.1.schema-base.json",
    ],
    schema: [
      "/vendor/openapi/oas-3.1.schema.json",
      "/api-docs/vendor/openapi/oas-3.1.schema.json",
    ],
    dialect: [
      "/vendor/openapi/oas-3.1.dialect.json",
      "/api-docs/vendor/openapi/oas-3.1.dialect.json",
    ],
  },
  3.2: {
    schemaBase: [
      "/vendor/openapi/oas-3.2.schema-base.json",
      "/api-docs/vendor/openapi/oas-3.2.schema-base.json",
    ],
    schema: [
      "/vendor/openapi/oas-3.2.schema.json",
      "/api-docs/vendor/openapi/oas-3.2.schema.json",
    ],
    dialect: [
      "/vendor/openapi/oas-3.2.dialect.json",
      "/api-docs/vendor/openapi/oas-3.2.dialect.json",
    ],
  },
};

function stripHtml(url) {
  return String(url).replace(/\.html$/, "");
}

function buildUrlToVendoredMap(version) {
  const p = PINNED[version];
  const v = VENDORED[version];

  // Map the canonical URI (without .html) to the primary vendored path.
  return new Map([
    [stripHtml(p.schemaBase), v.schemaBase[0]],
    [stripHtml(p.schema), v.schema[0]],
    [stripHtml(p.dialect), v.dialect[0]],
  ]);
}

// -------------------------
// OpenAPI 3.0.x validator (Ajv v6) — preserve behavior
// -------------------------
async function getAjvValidateOas30() {
  if (__ajvValidate30) return __ajvValidate30;

  const AjvMod = await import("https://esm.sh/ajv@6.12.6?bundle&target=es2022");
  const Ajv = AjvMod.default ?? AjvMod;

  const SchemasMod =
    await import("https://esm.sh/@apidevtools/openapi-schemas@2.1.0?bundle&target=es2022");
  const schemas = SchemasMod.default ?? SchemasMod;

  const oas30 =
    schemas.openapiV3 ??
    schemas.openapiV30 ??
    schemas["openapiV3"] ??
    schemas["openapiV30"];

  if (!oas30) {
    console.error("openapi-schemas module shape:", SchemasMod);
    throw new Error("Could not load OpenAPI 3.0 schema from openapi-schemas.");
  }

  const ajv = new Ajv({
    allErrors: true,
    schemaId: "auto",
    jsonPointers: true,
  });

  const draft4Meta = await fetchJsonWithFallbacks([
    "/vendor/ajv/json-schema-draft-04.json",
    "/api-docs/vendor/ajv/json-schema-draft-04.json",
  ]);
  ajv.addMetaSchema(draft4Meta);

  __ajvValidate30 = ajv.compile(oas30);
  return __ajvValidate30;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

// -------------------------
// OpenAPI 3.1 / 3.2 validators (Ajv v8) — pinned schema-base + loadSchema
// -------------------------
async function buildAjv8ValidatorFor(version) {
  const Ajv = window.Ajv2020;
  if (!Ajv)
    throw new Error(
      "Ajv2020 not loaded. Ensure /vendor/ajv8/ajv2020.iife.min.js is included.",
    );

  const urlToVendored = buildUrlToVendoredMap(version);
  const refCache = new Map();

  // Load schema-base (vendored-first, then pinned remote)
  const schemaBase = await fetchJsonWithFallbacks([
    ...VENDORED[version].schemaBase,
    PINNED[version].schemaBase,
  ]);

  const ajv = new Ajv({
    allErrors: true,
    strict: false, // Phase 1: don't break users; Phase 3 can enable strict mode
    messages: true,
    meta: false,
    validateSchema: false,
    loadSchema: async (uri) => {
      const normalized = stripHtml(uri);

      if (refCache.has(normalized)) return refCache.get(normalized);

      // 1) Vendored-first mapping for the pinned resources
      const vendoredPath = urlToVendored.get(normalized);
      if (vendoredPath) {
        const schema = await fetchJsonWithFallbacks([vendoredPath]);
        refCache.set(normalized, schema);
        return schema;
      }

      // 2) For spec.openapis refs, try ".html" and non-html forms
      if (normalized.startsWith("https://spec.openapis.org/")) {
        const schema = await fetchJsonWithFallbacks([
          `${normalized}.html`,
          normalized,
        ]);
        refCache.set(normalized, schema);
        return schema;
      }

      // 3) Generic fallback
      const schema = await fetchJsonWithFallbacks([normalized]);
      refCache.set(normalized, schema);
      return schema;
    },
  });

  return withTimeout(
    ajv.compileAsync(schemaBase),
    8000,
    `Ajv compileAsync(${version})`,
  );

  // compileAsync resolves $refs via loadSchema
  // return ajv.compileAsync(schemaBase);
}

async function getAjvValidateOas31() {
  if (__ajvValidate31) return __ajvValidate31;
  __ajvValidate31 = await buildAjv8ValidatorFor("3.1");
  return __ajvValidate31;
}

async function getAjvValidateOas32() {
  if (__ajvValidate32) return __ajvValidate32;
  __ajvValidate32 = await buildAjv8ValidatorFor("3.2");
  return __ajvValidate32;
}

// -------------------------
// Shared pipeline steps
// -------------------------
async function validateAgainstSchema(spec, version, result) {
  try {
    let validate;
    if (version === "3.2") validate = await getAjvValidateOas32();
    else if (version === "3.1") validate = await getAjvValidateOas31();
    else validate = await getAjvValidateOas30();

    const ok = validate(spec);
    if (!ok && validate.errors?.length) {
      for (const e of validate.errors) result.errors.push(normalizeAjvError(e));
    }
  } catch (err) {
    result.errors.push({
      code: "SCHEMA_VALIDATOR_FAILED",
      message: err?.message || String(err),
      path: "/",
      details: err,
    });
  }
}

function runSemanticChecks(spec, result, version) {
  try {
    assertSecuritySchemesDefined(spec);
  } catch (err) {
    result.errors.push({
      code: "MISSING_SECURITY_SCHEMES",
      message: err.message,
      path: "/security",
    });
  }

  try {
    assertServerVariablesShape(spec);
  } catch (err) {
    result.errors.push({
      code: "INVALID_SERVER_VARIABLES",
      message: err.message,
      path: "/servers",
    });
  }

  // Phase 1: lightweight nullable detection for 3.1+
  // (Phase 2: walk schemas and emit precise pointers)
  if (version !== "3.0") {
    const raw = JSON.stringify(spec);
    if (raw.includes('"nullable":true') || raw.includes('"nullable": true')) {
      result.warnings.push({
        code: "DEPRECATED_NULLABLE",
        severity: "warning",
        message:
          "OpenAPI 3.1+ deprecates 'nullable'. Prefer JSON Schema unions, e.g. type: ['string','null'].",
        path: "/",
      });
    }
  }
}

function runRefChecks(spec, result, options) {
  const unresolvedInternal = collectUnresolvedInternalRefs(spec);
  for (const ref of unresolvedInternal) {
    result.errors.push({
      code: "UNRESOLVED_INTERNAL_REF",
      message: `Unresolved internal $ref: ${ref}`,
      ref,
      path: "/",
    });
  }

  const externalRefs = collectExternalRefs(spec);
  if (externalRefs.length) {
    const { offline = true } = options || {};
    result.warnings.push({
      code: offline ? "EXTERNAL_REFS_OFFLINE" : "EXTERNAL_REFS",
      severity: "warning",
      message: offline
        ? `External $ref(s) present: ${externalRefs.join(
            ", ",
          )} — offline mode: not fetched.`
        : `External $ref(s) present: ${externalRefs.join(
            ", ",
          )}. Browser fetch may fail due to CORS.`,
      refs: externalRefs,
    });
  }
}

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
]);

function pushErr(result, code, message, path) {
  result.errors.push({ code, message, path });
}

function pushWarn(result, code, message, path) {
  result.warnings.push({ code, severity: "warning", message, path });
}

function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isNonEmptyStr(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function joinPath(base, seg) {
  // seg may need JSON Pointer escaping
  const s = String(seg).replace(/~/g, "~0").replace(/\//g, "~1");
  return base === "/" ? `/${s}` : `${base}/${s}`;
}

function extractServerVars(url) {
  // {var} tokens
  const vars = new Set();
  if (!isNonEmptyStr(url)) return vars;
  const re = /\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(url))) vars.add(m[1]);
  return vars;
}

function hasRefSiblings(obj) {
  if (!isObj(obj)) return false;
  if (!("$ref" in obj)) return false;
  const keys = Object.keys(obj).filter((k) => k !== "$ref");
  return keys.length > 0;
}

function runOas31FastChecks(spec, result) {
  // ---- jsonSchemaDialect sanity (optional) ----
  // In OAS 3.1, jsonSchemaDialect is allowed and defaults to the OAS 3.1 dialect.
  // We keep it as a warning-only check because many docs omit it.
  if ("jsonSchemaDialect" in spec) {
    const v = spec.jsonSchemaDialect;
    if (!isNonEmptyStr(v)) {
      pushWarn(
        result,
        "INVALID_JSON_SCHEMA_DIALECT",
        "jsonSchemaDialect should be a non-empty string URL.",
        "/jsonSchemaDialect",
      );
    }
  }

  // ---- servers url vars sanity ----
  if (Array.isArray(spec.servers)) {
    spec.servers.forEach((srv, i) => {
      const p = `/servers/${i}`;
      if (!isObj(srv)) {
        pushErr(result, "INVALID_SERVER", "Server entry must be an object.", p);
        return;
      }
      if (!isNonEmptyStr(srv.url)) {
        pushErr(
          result,
          "MISSING_SERVER_URL",
          "Server.url must be a non-empty string.",
          `${p}/url`,
        );
        return;
      }
      const used = extractServerVars(srv.url);
      const defined = isObj(srv.variables)
        ? new Set(Object.keys(srv.variables))
        : new Set();

      // Variables used in URL but not defined
      for (const name of used) {
        if (!defined.has(name)) {
          pushErr(
            result,
            "UNDEFINED_SERVER_VARIABLE",
            `Server URL variable '{${name}}' is used in url but not defined in server.variables.`,
            `${p}/variables`,
          );
        }
      }

      // Variables defined but not used in URL (warning)
      for (const name of defined) {
        if (!used.has(name)) {
          pushWarn(
            result,
            "UNUSED_SERVER_VARIABLE",
            `Server variable '${name}' is defined but not used in server.url.`,
            `${p}/variables/${name}`,
          );
        }
      }
    });
  }

  // ---- paths + operations ----
  if (!isObj(spec.paths)) return;

  for (const [rawPathKey, pathItem] of Object.entries(spec.paths)) {
    const pathPtr = joinPath("/paths", rawPathKey);

    if (!isObj(pathItem)) {
      pushErr(
        result,
        "INVALID_PATH_ITEM",
        "PathItem must be an object.",
        pathPtr,
      );
      continue;
    }

    for (const [key, op] of Object.entries(pathItem)) {
      // Skip non-operation keys
      if (
        key === "parameters" ||
        key === "summary" ||
        key === "description" ||
        key === "servers"
      ) {
        continue;
      }

      const method = key.toLowerCase();
      const opPtr = `${pathPtr}/${key}`;

      if (!HTTP_METHODS.has(method)) {
        pushWarn(
          result,
          "UNKNOWN_PATH_ITEM_KEY",
          `Unknown key '${key}' under path item. Expected an HTTP method or PathItem fields.`,
          opPtr,
        );
        continue;
      }

      if (!isObj(op)) {
        pushErr(
          result,
          "INVALID_OPERATION",
          `Operation '${key}' must be an object.`,
          opPtr,
        );
        continue;
      }

      // responses required
      if (!("responses" in op)) {
        pushErr(
          result,
          "MISSING_RESPONSES",
          "Operation must have 'responses'.",
          `${opPtr}/responses`,
        );
      } else if (!isObj(op.responses)) {
        pushErr(
          result,
          "INVALID_RESPONSES",
          "'responses' must be an object.",
          `${opPtr}/responses`,
        );
      } else {
        const respKeys = Object.keys(op.responses);
        if (respKeys.length === 0) {
          pushErr(
            result,
            "EMPTY_RESPONSES",
            "'responses' must contain at least one status code or 'default'.",
            `${opPtr}/responses`,
          );
        }

        for (const [code, resp] of Object.entries(op.responses)) {
          const respPtr = joinPath(`${opPtr}/responses`, code);

          if (!isObj(resp)) {
            pushErr(
              result,
              "INVALID_RESPONSE",
              "Response must be an object.",
              respPtr,
            );
            continue;
          }

          if (!("description" in resp) || !isNonEmptyStr(resp.description)) {
            pushErr(
              result,
              "MISSING_RESPONSE_DESCRIPTION",
              "Response.description is required and must be a non-empty string.",
              `${respPtr}/description`,
            );
          }

          // content sanity
          if ("content" in resp) {
            if (!isObj(resp.content)) {
              pushErr(
                result,
                "INVALID_RESPONSE_CONTENT",
                "Response.content must be an object.",
                `${respPtr}/content`,
              );
            } else {
              for (const [mt, media] of Object.entries(resp.content)) {
                const mtPtr = joinPath(`${respPtr}/content`, mt);
                if (!isObj(media)) {
                  pushErr(
                    result,
                    "INVALID_MEDIA_TYPE",
                    "MediaType must be an object.",
                    mtPtr,
                  );
                  continue;
                }
                if ("schema" in media && !isObj(media.schema)) {
                  pushErr(
                    result,
                    "INVALID_MEDIA_SCHEMA",
                    "MediaType.schema must be an object.",
                    `${mtPtr}/schema`,
                  );
                }
                // $ref sibling hygiene warning
                if (isObj(media.schema) && hasRefSiblings(media.schema)) {
                  pushWarn(
                    result,
                    "REF_WITH_SIBLINGS",
                    "Schema objects with $ref should not have sibling keywords (best practice).",
                    `${mtPtr}/schema`,
                  );
                }
              }
            }
          }
        }
      }

      // requestBody sanity
      if ("requestBody" in op) {
        const rb = op.requestBody;
        const rbPtr = `${opPtr}/requestBody`;

        // allow $ref strings/objects — just basic shape checks
        if (!isObj(rb)) {
          // could be a $ref string (some tools), warn not error
          pushWarn(
            result,
            "INVALID_REQUEST_BODY",
            "requestBody should be an object.",
            rbPtr,
          );
        } else if ("content" in rb) {
          if (!isObj(rb.content)) {
            pushErr(
              result,
              "INVALID_REQUEST_BODY_CONTENT",
              "requestBody.content must be an object.",
              `${rbPtr}/content`,
            );
          } else {
            for (const [mt, media] of Object.entries(rb.content)) {
              const mtPtr = joinPath(`${rbPtr}/content`, mt);
              if (!isObj(media)) {
                pushErr(
                  result,
                  "INVALID_MEDIA_TYPE",
                  "MediaType must be an object.",
                  mtPtr,
                );
                continue;
              }
              if ("schema" in media && !isObj(media.schema)) {
                pushErr(
                  result,
                  "INVALID_MEDIA_SCHEMA",
                  "MediaType.schema must be an object.",
                  `${mtPtr}/schema`,
                );
              }
              if (isObj(media.schema) && hasRefSiblings(media.schema)) {
                pushWarn(
                  result,
                  "REF_WITH_SIBLINGS",
                  "Schema objects with $ref should not have sibling keywords (best practice).",
                  `${mtPtr}/schema`,
                );
              }
            }
          }
        } else {
          // In OAS, requestBody should have content (unless you use $ref)
          pushWarn(
            result,
            "REQUEST_BODY_NO_CONTENT",
            "requestBody usually defines 'content'. If using $ref this can be ignored.",
            rbPtr,
          );
        }
      }

      // parameters sanity (operation-level)
      if ("parameters" in op) {
        const pPtr = `${opPtr}/parameters`;
        if (!Array.isArray(op.parameters)) {
          pushErr(
            result,
            "INVALID_PARAMETERS",
            "parameters must be an array.",
            pPtr,
          );
        } else {
          op.parameters.forEach((param, idx) => {
            const onePtr = `${pPtr}/${idx}`;
            if (!isObj(param)) {
              pushErr(
                result,
                "INVALID_PARAMETER",
                "Parameter must be an object.",
                onePtr,
              );
              return;
            }

            // $ref-only parameters are allowed; skip deep checks
            if ("$ref" in param) {
              if (!isNonEmptyStr(param.$ref)) {
                pushErr(
                  result,
                  "INVALID_REF",
                  "$ref must be a non-empty string.",
                  `${onePtr}/$ref`,
                );
              }
              if (hasRefSiblings(param)) {
                pushWarn(
                  result,
                  "REF_WITH_SIBLINGS",
                  "Parameter objects with $ref should not have sibling keywords (best practice).",
                  onePtr,
                );
              }
              return;
            }

            if (!isNonEmptyStr(param.name)) {
              pushErr(
                result,
                "MISSING_PARAMETER_NAME",
                "Parameter.name is required.",
                `${onePtr}/name`,
              );
            }
            if (!isNonEmptyStr(param.in)) {
              pushErr(
                result,
                "MISSING_PARAMETER_IN",
                "Parameter.in is required.",
                `${onePtr}/in`,
              );
            } else if (
              !["query", "header", "path", "cookie"].includes(param.in)
            ) {
              pushErr(
                result,
                "INVALID_PARAMETER_IN",
                "Parameter.in must be one of: query, header, path, cookie.",
                `${onePtr}/in`,
              );
            }

            // Either schema or content should exist
            const hasSchema = "schema" in param;
            const hasContent = "content" in param;

            if (!hasSchema && !hasContent) {
              pushErr(
                result,
                "PARAMETER_SCHEMA_OR_CONTENT_REQUIRED",
                "Parameter must define either 'schema' or 'content'.",
                onePtr,
              );
            }

            if (hasSchema && !isObj(param.schema)) {
              pushErr(
                result,
                "INVALID_PARAMETER_SCHEMA",
                "Parameter.schema must be an object.",
                `${onePtr}/schema`,
              );
            }
            if (hasContent && !isObj(param.content)) {
              pushErr(
                result,
                "INVALID_PARAMETER_CONTENT",
                "Parameter.content must be an object.",
                `${onePtr}/content`,
              );
            }

            if (isObj(param.schema) && hasRefSiblings(param.schema)) {
              pushWarn(
                result,
                "REF_WITH_SIBLINGS",
                "Schema objects with $ref should not have sibling keywords (best practice).",
                `${onePtr}/schema`,
              );
            }
          });
        }
      }
    }
  }

  // ---- components basic sanity ----
  if (spec.components != null) {
    if (!isObj(spec.components)) {
      pushErr(
        result,
        "INVALID_COMPONENTS",
        "components must be an object.",
        "/components",
      );
    } else {
      const comp = spec.components;

      if ("schemas" in comp && comp.schemas != null && !isObj(comp.schemas)) {
        pushErr(
          result,
          "INVALID_COMPONENT_SCHEMAS",
          "components.schemas must be an object.",
          "/components/schemas",
        );
      }
      if (
        "parameters" in comp &&
        comp.parameters != null &&
        !isObj(comp.parameters)
      ) {
        pushErr(
          result,
          "INVALID_COMPONENT_PARAMETERS",
          "components.parameters must be an object.",
          "/components/parameters",
        );
      }
      if (
        "responses" in comp &&
        comp.responses != null &&
        !isObj(comp.responses)
      ) {
        pushErr(
          result,
          "INVALID_COMPONENT_RESPONSES",
          "components.responses must be an object.",
          "/components/responses",
        );
      }
      if (
        "requestBodies" in comp &&
        comp.requestBodies != null &&
        !isObj(comp.requestBodies)
      ) {
        pushErr(
          result,
          "INVALID_COMPONENT_REQUEST_BODIES",
          "components.requestBodies must be an object.",
          "/components/requestBodies",
        );
      }
    }
  }
}

// -------------------------
// Public API — preserved contract
// -------------------------
export async function validateOpenApiSpec(spec, options = {}) {
  const { strict = false, offline = true } = options;

  const result = { errors: [], warnings: [] };

  const openapi = typeof spec?.openapi === "string" ? spec.openapi.trim() : "";
  const is30 = openapi.startsWith("3.0.");
  const is31 = openapi.startsWith("3.1.");
  const is32 = openapi.startsWith("3.2.");

  // -------------------------------------------------------
  // 0) Version routing
  // -------------------------------------------------------
  if (!openapi) {
    result.errors.push({
      code: "MISSING_OPENAPI_VERSION",
      message: `Missing required 'openapi' field (expected '3.0.x' or '3.1.x').`,
      path: "/openapi",
    });
  } else if (is32) {
    // ✅ Remove 3.2 entirely for now
    result.errors.push({
      code: "UNSUPPORTED_OPENAPI_VERSION",
      message:
        "OpenAPI 3.2.x is not supported in USS yet. Please use OpenAPI 3.1.x or 3.0.x.",
      path: "/openapi",
    });
  } else if (!is30 && !is31) {
    result.errors.push({
      code: "UNSUPPORTED_OPENAPI_VERSION",
      message: `Unsupported OpenAPI version '${openapi}'. USS supports 3.0.x and 3.1.x.`,
      path: "/openapi",
    });
  }

  // -------------------------------------------------------
  // 1) Schema validation (ONLY for 3.0.x)
  // -------------------------------------------------------
  if (is30) {
    try {
      const validate = await getAjvValidateOas30();
      const ok = validate(spec);

      if (!ok && validate.errors?.length) {
        for (const e of validate.errors) {
          result.errors.push({
            code: e.keyword || "AJV_ERROR",
            message: e.message || "Schema validation error",
            path: e.instancePath || "/",
            details: e,
          });
        }
      }
    } catch (err) {
      result.errors.push({
        code: "SCHEMA_VALIDATOR_FAILED",
        message: err.message || String(err),
      });
    }
  }

  // -------------------------------------------------------
  // 2) Best-effort fast validation for 3.1.x (no AJV meta-schema)
  // -------------------------------------------------------
  if (is31) {
    // your existing basic required checks...
    // (keep them, they’re great as early fail-fast)

    runOas31FastChecks(spec, result);

    result.warnings.push({
      code: "OAS31_FAST_VALIDATION",
      severity: "warning",
      message:
        "OpenAPI 3.1 validation is running in fast mode (semantic + ref + structural checks). Full 3.1 meta-schema validation is disabled for performance in the browser.",
      path: "/openapi",
    });
  }

  // -------------------------------------------------------
  // 3) USS semantic checks (apply to 3.0 + 3.1)
  // -------------------------------------------------------
  // Only run if the version is supported enough to inspect shape
  if (is30 || is31) {
    try {
      assertSecuritySchemesDefined(spec);
    } catch (err) {
      result.errors.push({
        code: "MISSING_SECURITY_SCHEMES",
        message: err.message,
        path: "/security",
      });
    }

    try {
      assertServerVariablesShape(spec);
    } catch (err) {
      result.errors.push({
        code: "INVALID_SERVER_VARIABLES",
        message: err.message,
        path: "/servers",
      });
    }

    // 4) Unresolved internal refs
    const unresolvedInternal = collectUnresolvedInternalRefs(spec);
    for (const ref of unresolvedInternal) {
      result.errors.push({
        code: "UNRESOLVED_INTERNAL_REF",
        message: `Unresolved internal $ref: ${ref}`,
        ref,
        path: "/",
      });
    }

    // 5) External refs policy
    const externalRefs = collectExternalRefs(spec);
    if (externalRefs.length) {
      result.warnings.push({
        code: offline ? "EXTERNAL_REFS_OFFLINE" : "EXTERNAL_REFS",
        severity: "warning",
        message: offline
          ? `External $ref(s) present: ${externalRefs.join(
              ", ",
            )} — offline mode: not fetched.`
          : `External $ref(s) present: ${externalRefs.join(
              ", ",
            )}. Browser fetch may fail due to CORS.`,
        refs: externalRefs,
      });
    }
  }

  if (strict && result.errors.length) {
    const agg = new Error(
      `[OpenAPI validation failed] ${result.errors.length} error(s).`,
    );
    agg.validationResult = result;
    throw agg;
  }

  return result;
}
