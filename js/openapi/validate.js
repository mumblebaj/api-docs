import { fetchJsonWithFallbacks } from "../utils/fetch.js";
import { assertSecuritySchemesDefined, assertServerVariablesShape } from "./semantic.js";
import { collectExternalRefs, collectUnresolvedInternalRefs } from "./refs.js";

let __ajvValidate = null;

async function getAjvValidate() {
  if (__ajvValidate) return __ajvValidate;

  const AjvMod = await import("https://esm.sh/ajv@6.12.6?bundle&target=es2022");
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

  __ajvValidate = ajv.compile(oas30);
  return __ajvValidate;
}

export async function validateOpenApiSpec(spec, options = {}) {
  const { strict = false, offline = true } = options;

  const result = { errors: [], warnings: [] };

  // 1) Schema validation via AJV
  try {
    const validate = await getAjvValidate();
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

  // 2) USS semantic checks
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

  // 3) Unresolved internal refs
  const unresolvedInternal = collectUnresolvedInternalRefs(spec);
  for (const ref of unresolvedInternal) {
    result.errors.push({
      code: "UNRESOLVED_INTERNAL_REF",
      message: `Unresolved internal $ref: ${ref}`,
      ref,
      path: "/",
    });
  }

  // 4) External refs policy
  const externalRefs = collectExternalRefs(spec);
  if (externalRefs.length) {
    result.warnings.push({
      code: offline ? "EXTERNAL_REFS_OFFLINE" : "EXTERNAL_REFS",
      severity: "warning",
      message: offline
        ? `External $ref(s) present: ${externalRefs.join(", ")} — offline mode: not fetched.`
        : `External $ref(s) present: ${externalRefs.join(", ")}. Browser fetch may fail due to CORS.`,
      refs: externalRefs,
    });
  }

  if (strict && result.errors.length) {
    const agg = new Error(`[OpenAPI validation failed] ${result.errors.length} error(s).`);
    agg.validationResult = result;
    throw agg;
  }

  return result;
}