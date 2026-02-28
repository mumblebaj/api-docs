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
  "3.1": {
    schemaBase: "https://spec.openapis.org/oas/3.1/schema-base/2025-11-23.html",
    schema: "https://spec.openapis.org/oas/3.1/schema/2025-11-23.html",
    dialect: "https://spec.openapis.org/oas/3.1/dialect/2024-11-10.html",
  },
  "3.2": {
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
  "3.1": {
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
  "3.2": {
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

  const AjvMod = await import(
    "https://esm.sh/ajv@6.12.6?bundle&target=es2022"
  );
  const Ajv = AjvMod.default ?? AjvMod;

  const SchemasMod = await import(
    "https://esm.sh/@apidevtools/openapi-schemas@2.1.0?bundle&target=es2022"
  );
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

// -------------------------
// OpenAPI 3.1 / 3.2 validators (Ajv v8) — pinned schema-base + loadSchema
// -------------------------
async function buildAjv8ValidatorFor(version) {
  const AjvMod = await import("https://esm.sh/ajv@8?bundle&target=es2022");
  const Ajv = AjvMod.default ?? AjvMod;

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

  // compileAsync resolves $refs via loadSchema
  return ajv.compileAsync(schemaBase);
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
            ", "
          )} — offline mode: not fetched.`
        : `External $ref(s) present: ${externalRefs.join(
            ", "
          )}. Browser fetch may fail due to CORS.`,
      refs: externalRefs,
    });
  }
}

// -------------------------
// Public API — preserved contract
// -------------------------
export async function validateOpenApiSpec(spec, options = {}) {
  const { strict = false } = options;

  const version = detectOasMajorMinor(spec);
  const result = { errors: [], warnings: [] };

  // 1) Schema validation
  await validateAgainstSchema(spec, version, result);

  // 2) Semantic checks
  runSemanticChecks(spec, result, version);

  // 3) Ref checks
  runRefChecks(spec, result, options);

  if (strict && result.errors.length) {
    const agg = new Error(
      `[OpenAPI validation failed] ${result.errors.length} error(s).`
    );
    agg.validationResult = result;
    throw agg;
  }

  return result;
}