// /api-docs/js/openapi/oas31FastChecks.js
// OpenAPI 3.1 Fast Validation (no AJV meta-schema compile)

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

function decodeJsonPointerToken(t) {
  return String(t).replace(/~1/g, "/").replace(/~0/g, "~");
}

function parsePathTemplateVars(pathTemplate) {
  const vars = new Set();
  if (!isNonEmptyStr(pathTemplate)) return vars;
  const re = /\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(pathTemplate))) {
    const name = String(m[1]).trim();
    if (name) vars.add(name);
  }
  return vars;
}

function isRefOnlyObject(obj) {
  return isObj(obj) && "$ref" in obj;
}

function normalizeParamKey(name, where) {
  return `${String(name)}|${String(where)}`;
}

function isComponentRef(ref) {
  return typeof ref === "string" && ref.startsWith("#/components/");
}

function resolveInternalPointer(root, pointer) {
  // Only supports internal pointers like "#/components/..."
  if (!isNonEmptyStr(pointer) || !pointer.startsWith("#/")) return undefined;

  const parts = pointer.slice(2).split("/").map(decodeJsonPointerToken);
  let cur = root;
  for (const seg of parts) {
    if (!isObj(cur) && !Array.isArray(cur)) return undefined;
    if (!(seg in cur)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

function pushWarnWithDetails(result, code, message, path, details) {
  result.warnings.push({ code, severity: "warning", message, path, details });
}

function validateParametersArray({
  result,
  params,
  basePtr, // e.g. "/paths/~1pets/get/parameters"
  allowRef = true,
  trackDuplicates = true,
}) {
  // Missing/undefined/null parameters is VALID in OAS
  if (params == null) {
    return {
      byKey: new Map(),
      entries: [],
    };
  }

  // If present, it must be an array
  if (!Array.isArray(params)) {
    pushErr(
      result,
      "INVALID_PARAMETERS",
      "parameters must be an array.",
      basePtr,
    );
    return {
      byKey: new Map(),
      entries: [],
    };
  }

  const byKey = new Map(); // key => { ptr, param, index }
  const entries = []; // { key, ptr, param }

  params.forEach((param, idx) => {
    const onePtr = `${basePtr}/${idx}`;

    if (!isObj(param)) {
      pushErr(
        result,
        "INVALID_PARAMETER",
        "Parameter must be an object.",
        onePtr,
      );
      return;
    }

    // $ref-only parameters are allowed (fast mode: validate string + hygiene)
    if (allowRef && "$ref" in param) {
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
      // duplicate detection can't safely inspect name/in for $ref targets in fast mode
      return;
    }

    // Required fields
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
    } else if (!["query", "header", "path", "cookie"].includes(param.in)) {
      pushErr(
        result,
        "INVALID_PARAMETER_IN",
        "Parameter.in must be one of: query, header, path, cookie.",
        `${onePtr}/in`,
      );
    }

    // schema/content presence
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

    // Duplicate detection (same name + in)
    if (
      trackDuplicates &&
      isNonEmptyStr(param.name) &&
      isNonEmptyStr(param.in)
    ) {
      const key = normalizeParamKey(param.name, param.in);
      if (byKey.has(key)) {
        const first = byKey.get(key);
        pushErr(
          result,
          "DUPLICATE_PARAMETER",
          `Duplicate parameter '${param.name}' in '${param.in}'. First occurrence at ${first.ptr}.`,
          onePtr,
        );
      } else {
        byKey.set(key, { ptr: onePtr, param, index: idx });
      }

      entries.push({ key, ptr: onePtr, param });
    }
  });

  return { byKey, entries };
}

function enforcePathParameters({
  result,
  pathTemplate,
  pathPtr, // e.g. "/paths/~1pets~1{petId}"
  opPtr, // e.g. "/paths/.../get"
  pathParamsArray, // pathItem.parameters
  opParamsArray, // operation.parameters
}) {
  const templateVars = parsePathTemplateVars(pathTemplate);

  // Validate both arrays and get maps for name|in
  const pathParams = validateParametersArray({
    result,
    params: pathParamsArray,
    basePtr: `${pathPtr}/parameters`,
    allowRef: true,
    trackDuplicates: true,
  });

  const opParams = validateParametersArray({
    result,
    params: opParamsArray,
    basePtr: `${opPtr}/parameters`,
    allowRef: true,
    trackDuplicates: true,
  });

  // Effective set: operation overrides pathItem for same name|in (OAS behavior)
  const effective = new Map(pathParams.byKey);
  for (const [k, v] of opParams.byKey.entries()) effective.set(k, v);

  // 1) Every {var} must have a corresponding in:path param in the effective set
  for (const v of templateVars) {
    const k = normalizeParamKey(v, "path");
    if (!effective.has(k)) {
      // Better pointer if operation has no parameters array at all
      const missingPtr = Array.isArray(opParamsArray)
        ? `${opPtr}/parameters`
        : opPtr;

      pushErr(
        result,
        "MISSING_PATH_PARAMETER",
        `Path template variable '{${v}}' is missing a corresponding in: path parameter (effective: pathItem + operation).`,
        missingPtr,
      );
    }
  }

  // 2) Every in:path param must exist in template AND be required: true
  for (const [k, info] of effective.entries()) {
    const [name, where] = k.split("|");
    if (where !== "path") continue;

    if (!templateVars.has(name)) {
      pushErr(
        result,
        "PATH_PARAMETER_NOT_IN_TEMPLATE",
        `in: path parameter '${name}' does not appear in the path template.`,
        `${info.ptr}/name`,
      );
    }

    const required = info.param?.required;
    if (required !== true) {
      // If 'required' is missing, point at the parameter object instead of a non-existent /required node
      const reqPtr =
        info.param &&
        Object.prototype.hasOwnProperty.call(info.param, "required")
          ? `${info.ptr}/required`
          : info.ptr;

      pushErr(
        result,
        "PATH_PARAMETER_MUST_BE_REQUIRED",
        `in: path parameter '${name}' must set required: true.`,
        reqPtr,
      );
    }
  }

  // 3) Optional: warn when operation overrides a pathItem param
  for (const [k, opInfo] of opParams.byKey.entries()) {
    if (pathParams.byKey.has(k)) {
      const first = pathParams.byKey.get(k);
      pushWarn(
        result,
        "OPERATION_OVERRIDES_PATH_PARAMETER",
        `Operation parameter overrides the pathItem parameter with the same name+in (pathItem at ${first.ptr}).`,
        opInfo.ptr,
      );
    }
  }
}

function walkForRefHygiene(
  node,
  ptr,
  result,
  spec,
) {
  if (!isObj(node) && !Array.isArray(node)) return;

  if (isObj(node)) {
    if ("$ref" in node) {
      const refPtr = `${ptr}/$ref`;

      if (!isNonEmptyStr(node.$ref)) {
        pushErr(
          result,
          "INVALID_REF",
          "$ref must be a non-empty string.",
          refPtr,
        );
      } else {
        // siblings warning (improved coverage: applies everywhere)
        if (hasRefSiblings(node)) {
          pushWarn(
            result,
            "REF_WITH_SIBLINGS",
            "Objects with $ref should not have sibling keywords (best practice).",
            ptr,
          );
        }
      }
    }

    for (const [k, v] of Object.entries(node)) {
      const childPtr = joinPath(ptr, k);
      walkForRefHygiene(v, childPtr, result, spec);
    }
    return;
  }

  // array
  node.forEach((v, i) => {
    walkForRefHygiene(v, `${ptr}/${i}`, result, spec);
  });
}

function walkForNullable(node, ptr, result) {
  if (!isObj(node) && !Array.isArray(node)) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walkForNullable(node[i], `${ptr}/${i}`, result);
    }
    return;
  }

  // object
  for (const [k, v] of Object.entries(node)) {
    const childPtr = joinPath(ptr, k);

    // Match prior behavior: only warn on nullable: true
    if (k === "nullable" && v === true) {
      pushWarn(
        result,
        "DEPRECATED_NULLABLE",
        "OpenAPI 3.1+ deprecates 'nullable'. Prefer JSON Schema unions, e.g. type: ['string','null'].",
        childPtr,
      );
    }

    walkForNullable(v, childPtr, result);
  }
}

// ---- Exported entry point ----
export function runOas31FastChecks(spec, result) {
  // ---- jsonSchemaDialect sanity (optional) ----
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

      // ---- Phase 2: Path parameter enforcement ----
      // NOTE: enforcePathParameters() also validates BOTH:
      // - pathItem.parameters
      // - operation.parameters
      // via validateParametersArray(), including duplicates and $ref hygiene.
      enforcePathParameters({
        result,
        pathTemplate: rawPathKey,
        pathPtr,
        opPtr,
        pathParamsArray: pathItem.parameters,
        opParamsArray: op.parameters,
      });

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
              }
            }
          }
        }
      }

      // requestBody sanity
      if ("requestBody" in op) {
        const rb = op.requestBody;
        const rbPtr = `${opPtr}/requestBody`;

        if (!isObj(rb)) {
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
          pushWarn(
            result,
            "REQUEST_BODY_NO_CONTENT",
            "requestBody usually defines 'content'. If using $ref this can be ignored.",
            rbPtr,
          );
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

  // ---- Phase 2: nullable pinpointing (OAS 3.1) ----
  walkForNullable(spec, "/", result);

  // ---- Phase 2: global $ref hygiene ----
  walkForRefHygiene(spec, "/", result, spec);
}
