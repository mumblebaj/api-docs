// js/exporter/docModel.js

export function buildDocModel(spec) {
  const title = spec?.info?.title || "OpenAPI Specification";
  const version = spec?.info?.version || "unversioned";
  const description = spec?.info?.description || null;
  const generatedAt = new Date().toISOString();

  const model = {
    meta: {
      title,
      version,
      description,
      generatedAt,
    },
    overview: {
      totalSchemas: 0,
      totalEndpoints: 0,
    },
    endpoints: [],
    schemas: [],
    enums: [],
  };

  // =====================================================
  // 🔹 Extract ENDPOINTS
  // =====================================================
  if (spec.paths && typeof spec.paths === "object") {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [verb, op] of Object.entries(methods)) {
        const endpoint = {
          path,
          method: verb,
          summary: op.summary || null,
          description: op.description || null,
          operationId: op.operationId || null,
          tags: op.tags || [],
          requestBodyExample: null,
          responses: [],
        };

        // --- Request Body Example (best effort)
        try {
          const req = op.requestBody?.content;
          if (req) {
            const first = Object.values(req)[0];
            const ex =
              first?.example ||
              (first?.examples && Object.values(first.examples)[0]?.value);
            endpoint.requestBodyExample = ex || null;
          }
        } catch {}

        // --- Responses + examples
        try {
          if (op.responses) {
            for (const [code, resp] of Object.entries(op.responses)) {
              let content = resp.content || {};
              let ex = null;
              // try json
              const json = content["application/json"];
              if (json) {
                ex =
                  json.example ||
                  (json.examples && Object.values(json.examples)[0]?.value);
              }
              // try generic
              if (!ex) {
                const first = Object.values(content)[0];
                ex =
                  first?.example ||
                  (first?.examples && Object.values(first.examples)[0]?.value);
              }
              endpoint.responses.push({
                status: code,
                description: resp.description || null,
                example: ex || null,
              });
            }
          }
        } catch {}

// ---------------------------------------------
// Extract request schema
// ---------------------------------------------
let requestSchemaName = null;
if (op.requestBody && op.requestBody.content) {
  for (const mediaType in op.requestBody.content) {
    const schema = op.requestBody.content[mediaType]?.schema;
    if (schema && schema.$ref) {
      requestSchemaName = schema.$ref.replace(
        /^#\/components\/schemas\//,
        ""
      );
      break;
    }
  }
}

// ---------------------------------------------
// Extract response schemas (may be multiple)
// ---------------------------------------------
let responseSchemas = [];
if (op.responses) {
  for (const statusCode in op.responses) {
    const respObj = op.responses[statusCode];
    const content = respObj?.content;
    if (!content) continue;
    for (const mediaType in content) {
      const schema = content[mediaType]?.schema;
      if (schema && schema.$ref) {
        const normalized = schema.$ref.replace(
          /^#\/components\/schemas\//,
          ""
        );
        if (!responseSchemas.includes(normalized)) {
          responseSchemas.push(normalized);
        }
      }
    }
  }
}

// 💥 Store schema linkage into the endpoint
endpoint.requestSchema = requestSchemaName;
endpoint.responseSchemas = responseSchemas;

// 🔹 Push endpoint into the model
model.endpoints.push(endpoint);

      }
    }
  }

  // =====================================================
  // 🔹 Extract SCHEMAS
  // =====================================================
  const schemas = spec?.components?.schemas || {};
  for (const [name, schema] of Object.entries(schemas)) {
    const schemaObj = {
      name,
      type: schema.type || null,
      description: schema.description || null,
      required: schema.required || [],
      properties: [],
      isEnum: Array.isArray(schema.enum),
      notes: [],
    };

    // ENUM
    if (schemaObj.isEnum) {
      model.enums.push({
        name,
        description: schema.description || null,
        values: (schema.enum || []).map((v) => ({ value: v })),
      });
    }

    // Properties
    if (schema.properties) {
      for (const [pName, p] of Object.entries(schema.properties)) {
        schemaObj.properties.push({
          name: pName,
          type: p.type || null,
          format: p.format || null,
          description: p.description || null,
          required: schemaObj.required.includes(pName),
          enum: p.enum || null,
          pattern: p.pattern || null,
          minimum: p.minimum || null,
          maximum: p.maximum || null,
          minLength: p.minLength || null,
          maxLength: p.maxLength || null,
          ref: p["$ref"] || null,
        });
      }
    }

    model.schemas.push(schemaObj);
  }

  model.overview.totalSchemas = model.schemas.length;
  model.overview.totalEndpoints = model.endpoints.length;

  // Build schema dependency graph
  model.schemaDependencies = buildSchemaDependencyGraph(model.schemas);

  // =====================================================
  // 📚 Build Table of Contents (ToC)
  // =====================================================
  model.toc = {
    sections: [
      {
        title: "Overview",
      },
      {
        title: "Endpoints",
        children: model.endpoints.map((ep) => ({
          title: `${ep.method.toUpperCase()} ${ep.path}`,
        })),
      },
      {
        title: "Schemas",
        children: model.schemas.map((s) => ({
          title: s.name,
        })),
      },
      {
        title: "Enums",
        children: model.enums.map((e) => ({
          title: e.name,
        })),
      },
    ],
  };

  return model;
}

//-------------------------------------------------------------
// Step A: Schema Dependency Graph Builder
//-------------------------------------------------------------

function buildSchemaDependencyGraph(schemas) {
  const graph = {};

  for (const schema of schemas) {
    const deps = new Set();
    collectSchemaDeps(schema, deps);
    graph[schema.name] = Array.from(deps);
  }

  return graph;
}

// Recursively collect dependencies for a schema
function collectSchemaDeps(schemaObj, deps) {
  if (!schemaObj || !Array.isArray(schemaObj.properties)) return;

  for (const prop of schemaObj.properties) {
    // Direct $ref
    if (prop.ref) {
      deps.add(stripRef(prop.ref));
    }

    // Array-of-$ref (future-proofing)
    if (prop.type === "array" && prop.items?.$ref) {
      deps.add(stripRef(prop.items.$ref));
    }

    // allOf / anyOf / oneOf (future-proof)
    ["allOf", "anyOf", "oneOf"].forEach(key => {
      if (prop[key]) {
        for (const item of prop[key]) {
          if (item.$ref) deps.add(stripRef(item.$ref));
        }
      }
    });
  }
}


// Normalize $ref → schema name
function stripRef(ref) {
  return ref.replace(/^#\/components\/schemas\//, "");
}


export function filterDocModelForSchemas(model, selectedNames) {
  const selected = new Set(selectedNames);

  // Helper: normalize $ref → schemaName
  // function stripRef(ref) {
  //   if (!ref) return ref;
  //   return ref.replace(/^#\/components\/schemas\//, "");
  // }

  // ---------------------------------------------
  // Filter Schemas
  // ---------------------------------------------
  const filteredSchemas = model.schemas.filter((s) => selected.has(s.name));

  const filteredEnums = model.enums.filter((e) => selected.has(e.name));

  // ---------------------------------------------
  // Filter Endpoints referencing selected schemas
  // ---------------------------------------------
  const filteredEndpoints = model.endpoints.filter((ep) => {
    // 1) request schema direct
    if (ep.requestSchema) {
      const normalized = stripRef(ep.requestSchema);

      if (selected.has(normalized)) return true;
    }

    // 2) response schemas array
    if (ep.responseSchemas) {
      for (const r of ep.responseSchemas) {
        const normalized = stripRef(r);
        if (selected.has(normalized)) return true;
      }
    }

    // 3) parameter schemas (optional future coverage)
    if (ep.parametersSchemas) {
      for (const p of ep.parametersSchemas) {
        const normalized = stripRef(p);
        if (selected.has(normalized)) return true;
      }
    }

    return false;
  });

  // ---------------------------------------------
  // Build filtered model
  // ---------------------------------------------
  const filtered = {
    ...model,
    endpoints: filteredEndpoints,
    schemas: filteredSchemas,
    enums: filteredEnums,
    meta: { ...model.meta },
  };

  // ---------------------------------------------
  // Rebuild overview
  // ---------------------------------------------
  filtered.overview = {
    ...model.overview,
    totalSchemas: filteredSchemas.length,
    totalEndpoints: filteredEndpoints.length,
  };

  // ---------------------------------------------
  // Rebuild ToC
  // ---------------------------------------------
  filtered.toc = {
    sections: [
      { title: "Overview" },
      {
        title: "Endpoints",
        children: filteredEndpoints.map((ep) => ({
          title: `${ep.method.toUpperCase()} ${ep.path}`,
        })),
      },
      {
        title: "Schemas",
        children: filteredSchemas.map((s) => ({
          title: s.name,
        })),
      },
      {
        title: "Enums",
        children: filteredEnums.map((e) => ({
          title: e.name,
        })),
      },
    ],
  };

  return filtered;
}
