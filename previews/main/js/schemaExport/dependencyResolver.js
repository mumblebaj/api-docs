// js/schemaExport/dependencyResolver.js

/**
 * Normalizes the schema dependency graph produced by docModel.
 *
 * @param {Object<string, string[]>} schemaDependencies
 * @returns {Object<string, string[]>}
 */
export function buildSchemaDependencyMap(schemaDependencies = {}) {
  const map = {};

  Object.keys(schemaDependencies).forEach((schemaName) => {
    map[schemaName] = Array.isArray(schemaDependencies[schemaName])
      ? schemaDependencies[schemaName].slice()
      : [];
  });

  return map;
}
