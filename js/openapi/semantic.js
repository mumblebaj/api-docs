// Collect security scheme names referenced by root + operations
function collectSecuritySchemeRefs(spec) {
  const refs = new Set();

  function addSecurityReqArray(security) {
    if (!Array.isArray(security)) return;
    for (const req of security) {
      if (req && typeof req === "object") {
        for (const schemeName of Object.keys(req)) refs.add(schemeName);
      }
    }
  }

  addSecurityReqArray(spec?.security);

  const paths = spec?.paths || {};
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const op of Object.values(pathItem)) {
      if (!op || typeof op !== "object") continue;
      addSecurityReqArray(op.security);
    }
  }

  return [...refs];
}

export function assertSecuritySchemesDefined(spec) {
  const defined = new Set(Object.keys(spec?.components?.securitySchemes || {}));
  const referenced = collectSecuritySchemeRefs(spec);

  const missing = referenced.filter((name) => !defined.has(name));
  if (missing.length) {
    throw new Error(
      `Undefined security scheme(s) referenced: ${missing.join(", ")}. ` +
        `Define them under components.securitySchemes (OpenAPI 3.0.3).`,
    );
  }
}

export function assertServerVariablesShape(spec) {
  const servers = Array.isArray(spec?.servers) ? spec.servers : [];
  servers.forEach((srv, i) => {
    if (!srv || typeof srv !== "object") return;
    if (!srv.variables) return;

    if (typeof srv.variables !== "object" || Array.isArray(srv.variables)) {
      throw new Error(`servers[${i}].variables must be an object/map.`);
    }

    for (const [varName, varObj] of Object.entries(srv.variables)) {
      if (!varObj || typeof varObj !== "object" || Array.isArray(varObj)) {
        throw new Error(
          `servers[${i}].variables.${varName} must be an object with at least a 'default' field.`,
        );
      }
      if (!("default" in varObj)) {
        throw new Error(
          `servers[${i}].variables.${varName} is missing required field 'default'.`,
        );
      }
      if ("enum" in varObj && !Array.isArray(varObj.enum)) {
        throw new Error(
          `servers[${i}].variables.${varName}.enum must be an array if provided.`,
        );
      }
    }
  });
}