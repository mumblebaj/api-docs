// js/schemaExport/selectionUtils.js

export function createSelectionState() {
  return {
    userSelected: new Set(),
    autoSelected: new Set(),
    userDeselected: new Set(),
  };
}

export function applyUserSelection(state, schemaName, dependencies = []) {
  state.userSelected.add(schemaName);
  state.userDeselected.delete(schemaName);

  // incremental add still fine
  dependencies.forEach((dep) => {
    if (!state.userDeselected.has(dep)) {
      state.autoSelected.add(dep);
    }
  });
}

export function applyUserDeselection(state, schemaName, dependencyMap = {}) {
  state.userSelected.delete(schemaName);
  state.userDeselected.add(schemaName);

  // 🔑 recompute everything
  recomputeAutoSelected(state, dependencyMap);
}

export function recomputeAutoSelected(state, dependencyMap = {}) {
  state.autoSelected.clear();

  state.userSelected.forEach((schema) => {
    const deps = dependencyMap[schema] || [];
    deps.forEach((dep) => {
      if (!state.userDeselected.has(dep)) {
        state.autoSelected.add(dep);
      }
    });
  });
}

export function getFinalSelection(state) {
  return Array.from(new Set([...state.userSelected, ...state.autoSelected]));
}

export function getDependencyCount(state) {
  return state.autoSelected.size;
}
