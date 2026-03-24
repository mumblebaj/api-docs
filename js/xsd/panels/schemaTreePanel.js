export function createSchemaTreePanel(host) {
  let onNodeClick = null;

  return {
    onSelect(fn) {
      onNodeClick = fn;
    },

    render(tree) {
      if (!tree.length) {
        host.innerHTML = `<div class="results-empty">No schema elements detected.</div>`;
        return;
      }

      host.innerHTML = tree.map(renderNode).join("");

      host.querySelectorAll("[data-node]").forEach((el) => {
        el.addEventListener("click", () => {
          const node = JSON.parse(el.dataset.node);
          if (onNodeClick) onNodeClick(node);
        });
      });
    }
  };
}

function renderNode(node, depth = 0) {
  const indent = depth * 14;

  let html = `
    <div class="schema-tree-node" style="padding-left:${indent}px" data-node='${JSON.stringify(node)}'>
      <span class="schema-tree-kind">${node.kind}</span>
      <span class="schema-tree-label">${node.label}</span>
    </div>
  `;

  if (node.children?.length) {
    html += node.children.map((child) => renderNode(child, depth + 1)).join("");
  }

  return html;
}