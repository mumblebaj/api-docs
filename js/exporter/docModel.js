// js/exporter/docModel.js

export function buildDocModel(spec) {
  const info = spec?.info || {};
  const generatedAt = new Date().toISOString();

  // ----------------------------
  // Helpers
  // ----------------------------
  const schemas = spec?.components?.schemas || {};
  const componentParams = spec?.components?.parameters || {};
  const securitySchemes = spec?.components?.securitySchemes || {};
  const componentHeaders = spec?.components?.headers || {};
  const componentExamples = spec?.components?.examples || {};
  const componentResponses = spec?.components?.responses || {};

  const stripSchemaRef = (ref) =>
    typeof ref === "string"
      ? ref.replace(/^#\/components\/schemas\//, "")
      : ref;

  const stripParamRef = (ref) =>
    typeof ref === "string"
      ? ref.replace(/^#\/components\/parameters\//, "")
      : ref;

  const stripHeaderRef = (ref) =>
    typeof ref === "string"
      ? ref.replace(/^#\/components\/headers\//, "")
      : ref;

  function normalizeServers(servers) {
    if (!Array.isArray(servers)) return [];
    return servers.map((s) => ({
      url: s?.url || "",
      description: s?.description || null,
      variables: normalizeServerVariables(s?.variables),
    }));
  }

  const stripExampleRef = (ref) =>
    typeof ref === "string"
      ? ref.replace(/^#\/components\/examples\//, "")
      : ref;

  const stripResponseRef = (ref) =>
    typeof ref === "string"
      ? ref.replace(/^#\/components\/responses\//, "")
      : ref;

  function resolveExampleObject(exampleOrRef) {
    if (!exampleOrRef) return null;

    if (exampleOrRef.$ref && typeof exampleOrRef.$ref === "string") {
      const key = stripExampleRef(exampleOrRef.$ref);
      const resolved = componentExamples?.[key];
      if (!resolved) return { unresolvedRef: exampleOrRef.$ref };
      return { ...resolved, __refName: key };
    }

    return exampleOrRef;
  }

  function resolveResponseObject(respOrRef) {
    if (!respOrRef) return null;

    if (respOrRef.$ref && typeof respOrRef.$ref === "string") {
      const key = stripResponseRef(respOrRef.$ref);
      const resolved = componentResponses?.[key];
      if (!resolved) return { unresolvedRef: respOrRef.$ref };
      return { ...resolved, __refName: key };
    }

    return respOrRef;
  }

  function normalizeServerVariables(vars) {
    if (!vars || typeof vars !== "object") return [];
    return Object.entries(vars).map(([name, v]) => ({
      name,
      default: v?.default ?? null,
      enum: Array.isArray(v?.enum) ? v.enum : null,
      description: v?.description || null,
    }));
  }

  function normalizeSecurityRequirement(security) {
    if (!Array.isArray(security)) return [];
    const out = [];
    for (const req of security) {
      if (!req || typeof req !== "object") continue;
      for (const [scheme, scopes] of Object.entries(req)) {
        out.push({
          scheme,
          scopes: Array.isArray(scopes) ? scopes : [],
        });
      }
    }
    return out;
  }

  function normalizeSecuritySchemes(schemesObj) {
    if (!schemesObj || typeof schemesObj !== "object") return [];

    return Object.entries(schemesObj).map(([name, s]) => {
      const base = {
        name,
        type: s?.type || null,
        description: s?.description || null,
        in: s?.in || null,
        scheme: s?.scheme || null,
        bearerFormat: s?.bearerFormat || null,
        openIdConnectUrl: s?.openIdConnectUrl || null,
        flows: s?.flows || null,
      };

      // Pretty oauth2 flows summary
      if (s?.type === "oauth2" && s?.flows && typeof s.flows === "object") {
        base.oauth2 = Object.entries(s.flows).map(([flowName, f]) => ({
          flow: flowName,
          authorizationUrl: f?.authorizationUrl || null,
          tokenUrl: f?.tokenUrl || null,
          refreshUrl: f?.refreshUrl || null,
          scopes:
            f?.scopes && typeof f.scopes === "object"
              ? Object.keys(f.scopes)
              : [],
        }));
      } else {
        base.oauth2 = null;
      }

      return base;
    });
  }

  function resolveParameterObject(paramOrRef) {
    if (!paramOrRef) return null;

    if (paramOrRef.$ref && typeof paramOrRef.$ref === "string") {
      const key = stripParamRef(paramOrRef.$ref);
      const resolved = componentParams?.[key];
      if (!resolved) return { unresolvedRef: paramOrRef.$ref };
      return { ...resolved, __refName: key };
    }

    return paramOrRef;
  }

  function resolveHeaderObject(headerOrRef) {
    if (!headerOrRef) return null;

    if (headerOrRef.$ref && typeof headerOrRef.$ref === "string") {
      const key = stripHeaderRef(headerOrRef.$ref);
      const resolved = componentHeaders?.[key];
      if (!resolved) return { unresolvedRef: headerOrRef.$ref };
      return { ...resolved, __refName: key };
    }

    return headerOrRef;
  }

  function normalizeSchemaBits(schema) {
    if (!schema || typeof schema !== "object") return null;
    return {
      type: schema.type || null,
      format: schema.format || null,
      pattern: schema.pattern || null,
      enum: Array.isArray(schema.enum) ? schema.enum : null,
      minimum: schema.minimum ?? null,
      maximum: schema.maximum ?? null,
      minLength: schema.minLength ?? null,
      maxLength: schema.maxLength ?? null,
      ref: schema.$ref || null,
      itemsRef: schema?.items?.$ref || null,
    };
  }

  function collectSchemaRefs(schema, acc = new Set()) {
    if (!schema || typeof schema !== "object") return acc;

    if (typeof schema.$ref === "string") {
      acc.add(stripSchemaRef(schema.$ref));
      return acc;
    }

    const arrays = ["allOf", "oneOf", "anyOf", "prefixItems"];
    for (const k of arrays) {
      if (Array.isArray(schema[k])) {
        for (const sub of schema[k]) collectSchemaRefs(sub, acc);
      }
    }

    if (schema.properties && typeof schema.properties === "object") {
      for (const sub of Object.values(schema.properties))
        collectSchemaRefs(sub, acc);
    }
    if (
      schema.patternProperties &&
      typeof schema.patternProperties === "object"
    ) {
      for (const sub of Object.values(schema.patternProperties))
        collectSchemaRefs(sub, acc);
    }
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      collectSchemaRefs(schema.additionalProperties, acc);
    }

    if (schema.items) collectSchemaRefs(schema.items, acc);
    if (schema.contains) collectSchemaRefs(schema.contains, acc);
    if (schema.not) collectSchemaRefs(schema.not, acc);
    if (schema.if) collectSchemaRefs(schema.if, acc);
    if (schema.then) collectSchemaRefs(schema.then, acc);
    if (schema.else) collectSchemaRefs(schema.else, acc);

    if (
      schema.dependentSchemas &&
      typeof schema.dependentSchemas === "object"
    ) {
      for (const sub of Object.values(schema.dependentSchemas))
        collectSchemaRefs(sub, acc);
    }

    return acc;
  }

  function listMediaTypes(contentObj) {
    if (!contentObj || typeof contentObj !== "object") return [];
    return Object.keys(contentObj);
  }

  function listExampleKeysForMedia(mediaObj) {
    if (!mediaObj || typeof mediaObj !== "object") return [];
    if (!mediaObj.examples || typeof mediaObj.examples !== "object") return [];

    // include keys even if the entry is a $ref
    return Object.keys(mediaObj.examples);
  }

  function pickBestExampleForMedia(mediaObj) {
    if (!mediaObj || typeof mediaObj !== "object") return null;

    // 1) explicit example
    if (mediaObj.example != null) return mediaObj.example;

    // 2) first examples[*]
    if (mediaObj.examples && typeof mediaObj.examples === "object") {
      const first = Object.values(mediaObj.examples)[0];

      // examples entries can be:
      // - { value: ... }
      // - { $ref: '#/components/examples/...' }
      if (first?.value != null) return first.value;

      const ex = resolveExampleObject(first);
      if (ex?.unresolvedRef) return null;

      // components/examples entries can be { value } or { externalValue }
      if (ex?.value != null) return ex.value;

      return null;
    }

    return null;
  }

  function extractContentExamples(contentObj) {
    if (!contentObj || typeof contentObj !== "object") return null;

    // Prefer application/json; else first media type
    const mediaTypes = Object.keys(contentObj);
    if (!mediaTypes.length) return null;

    const media = contentObj["application/json"] || contentObj[mediaTypes[0]];
    return pickBestExampleForMedia(media);
  }

  function extractContentExampleKeys(contentObj) {
    if (!contentObj || typeof contentObj !== "object") return {};
    const out = {};

    for (const [mt, mediaObj] of Object.entries(contentObj)) {
      const keys = listExampleKeysForMedia(mediaObj);
      if (keys.length) out[mt] = keys;
    }

    return out;
  }

  function extractContentSchemaRefs(contentObj) {
    if (!contentObj || typeof contentObj !== "object") return [];
    const refs = new Set();
    for (const media of Object.values(contentObj)) {
      const schema = media?.schema;
      collectSchemaRefs(schema, refs);
    }
    return Array.from(refs);
  }

  function normalizeResponseHeaders(headersObj) {
    // headersObj: { HeaderName: Header | Reference }
    if (!headersObj || typeof headersObj !== "object") return [];
    const out = [];

    for (const [name, raw] of Object.entries(headersObj)) {
      const h = resolveHeaderObject(raw);
      if (!h) continue;

      if (h.unresolvedRef) {
        out.push({
          name,
          description: "Unresolved header $ref",
          schema: null,
          unresolvedRef: h.unresolvedRef,
          refName: null,
        });
        continue;
      }

      const schemaBits = normalizeSchemaBits(h.schema);

      out.push({
        name,
        description: h.description || null,
        deprecated: typeof h.deprecated === "boolean" ? h.deprecated : null,
        style: h.style || null,
        explode: typeof h.explode === "boolean" ? h.explode : null,
        schema: schemaBits,
        refName: h.__refName || null,
      });
    }

    return out;
  }

  // ----------------------------
  // Model root
  // ----------------------------
  const model = {
    meta: {
      title: info?.title || "OpenAPI Specification",
      version: info?.version || "unversioned",
      description: info?.description || null,
      termsOfService: info?.termsOfService || null,
      contact: info?.contact || null,
      license: info?.license || null,
      openapi: spec?.openapi || null,
      jsonSchemaDialect: spec?.jsonSchemaDialect || null, // 3.1 field
      generatedAt,
    },
    overview: {
      totalSchemas: 0,
      totalEndpoints: 0,
      totalEnums: 0,
      totalSecuritySchemes: 0,
      totalParameters: 0,
      totalHeaders: 0,
    },
    servers: normalizeServers(spec?.servers),
    tags: Array.isArray(spec?.tags) ? spec.tags : [],
    externalDocs: spec?.externalDocs || null,
    security: {
      global: normalizeSecurityRequirement(spec?.security),
      schemes: normalizeSecuritySchemes(securitySchemes),
    },
    components: {
      parameters: Object.keys(componentParams || {}),
      responses: Object.keys(spec?.components?.responses || {}),
      requestBodies: Object.keys(spec?.components?.requestBodies || {}),
      headers: Object.keys(componentHeaders || {}),
      examples: Object.keys(spec?.components?.examples || {}),
      links: Object.keys(spec?.components?.links || {}),
      callbacks: Object.keys(spec?.components?.callbacks || {}),
      pathItems: Object.keys(spec?.components?.pathItems || {}), // 3.1
    },
    endpoints: [],
    schemas: [],
    enums: [],
  };

  // =====================================================
  // Endpoints from paths (3.0+ / 3.1)
  // =====================================================
  const httpMethods = new Set([
    "get",
    "put",
    "post",
    "delete",
    "options",
    "head",
    "patch",
    "trace",
  ]);

  function ingestOperation({ path, method, op, pathItem, isWebhook = false }) {
    const endpoint = {
      path,
      method,
      isWebhook,
      summary: op?.summary || null,
      description: op?.description || null,
      operationId: op?.operationId || null,
      tags: Array.isArray(op?.tags) ? op.tags : [],
      deprecated: typeof op?.deprecated === "boolean" ? op.deprecated : null,

      // Overrides
      servers: normalizeServers(op?.servers),
      security: normalizeSecurityRequirement(op?.security),

      // Parameters
      parameters: [],
      parametersSchemas: [],

      // Request
      requestBody: {
        required:
          typeof op?.requestBody?.required === "boolean"
            ? op.requestBody.required
            : null,
        description: op?.requestBody?.description || null,
        mediaTypes: listMediaTypes(op?.requestBody?.content),
        exampleKeysByMedia: extractContentExampleKeys(op?.requestBody?.content),
      },
      requestBodyExample: null,
      requestSchemas: [],

      // Responses
      responses: [],
      responseSchemas: [],

      // Extras
      callbacks: op?.callbacks || null,
      externalDocs: op?.externalDocs || null,
    };

    // Request example + schema refs
    try {
      const reqContent = op?.requestBody?.content;
      endpoint.requestBodyExample = extractContentExamples(reqContent);
      endpoint.requestSchemas = extractContentSchemaRefs(reqContent);
    } catch {}

    // Responses
    try {
      const respRefs = new Set();
      if (op?.responses && typeof op.responses === "object") {
        for (const [code, respRaw] of Object.entries(op.responses)) {
          const resp = resolveResponseObject(respRaw);

          // unresolved $ref safety
          const respObj = resp?.unresolvedRef ? respRaw : resp;

          const content = respObj?.content || {};
          const mediaTypes = listMediaTypes(content);

          endpoint.responses.push({
            status: code,
            description: respObj?.description || null,
            mediaTypes,
            exampleKeysByMedia: extractContentExampleKeys(content),
            example: extractContentExamples(content),
            headers: normalizeResponseHeaders(respObj?.headers),
            // optional breadcrumb:
            refName: resp?.__refName || null,
            unresolvedRef: resp?.unresolvedRef || null,
          });

          for (const ref of extractContentSchemaRefs(content))
            respRefs.add(ref);
        }
      }
      endpoint.responseSchemas = Array.from(respRefs);
    } catch {}

    // Parameters (path-level + op-level + $ref)
    try {
      const pathLevelParams = Array.isArray(pathItem?.parameters)
        ? pathItem.parameters
        : [];
      const opLevelParams = Array.isArray(op?.parameters) ? op.parameters : [];

      const allParams = [...pathLevelParams, ...opLevelParams];

      for (const raw of allParams) {
        const p = resolveParameterObject(raw);
        if (!p) continue;

        if (p.unresolvedRef) {
          endpoint.parameters.push({
            name: p.unresolvedRef,
            in: null,
            required: null,
            description: "Unresolved parameter $ref",
            schema: null,
            unresolvedRef: p.unresolvedRef,
          });
          continue;
        }

        const schemaBits = normalizeSchemaBits(p.schema);

        endpoint.parameters.push({
          name: p.name || (p.__refName ? `(ref) ${p.__refName}` : null),
          in: p.in || null,
          required: typeof p.required === "boolean" ? p.required : null,
          description: p.description || null,
          deprecated: typeof p.deprecated === "boolean" ? p.deprecated : null,
          allowEmptyValue:
            typeof p.allowEmptyValue === "boolean" ? p.allowEmptyValue : null,
          style: p.style || null,
          explode: typeof p.explode === "boolean" ? p.explode : null,
          schema: schemaBits,
          refName: p.__refName || null,
        });

        if (schemaBits?.ref)
          endpoint.parametersSchemas.push(stripSchemaRef(schemaBits.ref));
        if (schemaBits?.itemsRef)
          endpoint.parametersSchemas.push(stripSchemaRef(schemaBits.itemsRef));
      }

      endpoint.parametersSchemas = Array.from(
        new Set(endpoint.parametersSchemas),
      );
    } catch {}

    model.endpoints.push(endpoint);
  }

  // Paths
  if (spec?.paths && typeof spec.paths === "object") {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;

      for (const [k, op] of Object.entries(pathItem)) {
        const method = String(k).toLowerCase();
        if (!httpMethods.has(method)) continue;
        ingestOperation({ path, method, op, pathItem, isWebhook: false });
      }
    }
  }

  // OpenAPI 3.1: webhooks
  if (spec?.webhooks && typeof spec.webhooks === "object") {
    for (const [name, pathItem] of Object.entries(spec.webhooks)) {
      if (!pathItem || typeof pathItem !== "object") continue;

      const path = `webhook:${name}`;
      for (const [k, op] of Object.entries(pathItem)) {
        const method = String(k).toLowerCase();
        if (!httpMethods.has(method)) continue;
        ingestOperation({ path, method, op, pathItem, isWebhook: true });
      }
    }
  }

  // =====================================================
  // Schemas + enums (components/schemas)
  // =====================================================
  for (const [name, schema] of Object.entries(schemas)) {
    const schemaObj = {
      name,
      type: schema?.type || null,
      description: schema?.description || null,
      required: Array.isArray(schema?.required) ? schema.required : [],
      properties: [],
      isEnum: Array.isArray(schema?.enum),
      notes: [],
      schemaDialect: schema?.$schema || null,
    };

    if (schemaObj.isEnum) {
      model.enums.push({
        name,
        description: schema?.description || null,
        values: (schema.enum || []).map((v) => ({ value: v })),
      });
    }

    if (schema?.properties && typeof schema.properties === "object") {
      for (const [pName, p] of Object.entries(schema.properties)) {
        schemaObj.properties.push({
          name: pName,
          type: p?.type || null,
          format: p?.format || null,
          description: p?.description || null,
          required: schemaObj.required.includes(pName),
          enum: Array.isArray(p?.enum) ? p.enum : null,
          pattern: p?.pattern || null,
          minimum: p?.minimum ?? null,
          maximum: p?.maximum ?? null,
          minLength: p?.minLength ?? null,
          maxLength: p?.maxLength ?? null,
          ref: p?.$ref ? stripSchemaRef(p.$ref) : null,
          itemsRef: p?.items?.$ref ? stripSchemaRef(p.items.$ref) : null,
        });
      }
    }

    model.schemas.push(schemaObj);
  }

  // Overview stats
  model.overview.totalEndpoints = model.endpoints.length;
  model.overview.totalSchemas = model.schemas.length;
  model.overview.totalEnums = model.enums.length;
  model.overview.totalSecuritySchemes = model.security.schemes.length;
  model.overview.totalParameters = Object.keys(componentParams || {}).length;
  model.overview.totalHeaders = Object.keys(componentHeaders || {}).length;

  return model;
}

// ------------------------------------------------------------
// Export: Filter doc model by selected schema names
// Compatible with both:
// - old model: ep.requestSchema (string) + ep.responseSchemas (array)
// - new model: ep.requestSchemas (array) + ep.responseSchemas (array) + ep.parametersSchemas (array)
// ------------------------------------------------------------
export function filterDocModelForSchemas(model, selectedNames) {
  const selected = new Set(selectedNames || []);

  const stripRef = (ref) => {
    if (!ref || typeof ref !== "string") return ref;
    return ref.replace(/^#\/components\/schemas\//, "");
  };

  // ----------------------------
  // Filter Schemas / Enums
  // ----------------------------
  const filteredSchemas = (model.schemas || []).filter((s) => selected.has(s.name));
  const filteredEnums = (model.enums || []).filter((e) => selected.has(e.name));

  // ----------------------------
  // Filter Endpoints that reference selected schemas
  // ----------------------------
  const filteredEndpoints = (model.endpoints || []).filter((ep) => {
    // OLD: requestSchema (single)
    if (ep.requestSchema) {
      const n = stripRef(ep.requestSchema);
      if (selected.has(n)) return true;
    }

    // NEW: requestSchemas (array)
    if (Array.isArray(ep.requestSchemas)) {
      for (const r of ep.requestSchemas) {
        const n = stripRef(r);
        if (selected.has(n)) return true;
      }
    }

    // OLD/NEW: responseSchemas (array)
    if (Array.isArray(ep.responseSchemas)) {
      for (const r of ep.responseSchemas) {
        const n = stripRef(r);
        if (selected.has(n)) return true;
      }
    }

    // NEW: parametersSchemas (array)
    if (Array.isArray(ep.parametersSchemas)) {
      for (const p of ep.parametersSchemas) {
        const n = stripRef(p);
        if (selected.has(n)) return true;
      }
    }

    return false;
  });

  // ----------------------------
  // Build filtered model
  // ----------------------------
  const filtered = {
    ...model,
    endpoints: filteredEndpoints,
    schemas: filteredSchemas,
    enums: filteredEnums,
    meta: { ...(model.meta || {}) },
  };

  // ----------------------------
  // Rebuild overview (keep other counters if present)
  // ----------------------------
  filtered.overview = {
    ...(model.overview || {}),
    totalSchemas: filteredSchemas.length,
    totalEndpoints: filteredEndpoints.length,
    totalEnums: filteredEnums.length,
  };

  // ----------------------------
  // Rebuild ToC if you use it
  // ----------------------------
  if (model.toc && model.toc.sections) {
    filtered.toc = {
      sections: [
        { title: "Overview" },
        {
          title: "Endpoints",
          children: filteredEndpoints.map((ep) => ({
            title: `${String(ep.method || "").toUpperCase()} ${ep.path || ""}`,
          })),
        },
        {
          title: "Schemas",
          children: filteredSchemas.map((s) => ({ title: s.name })),
        },
        {
          title: "Enums",
          children: filteredEnums.map((e) => ({ title: e.name })),
        },
      ],
    };
  }

  return filtered;
}
