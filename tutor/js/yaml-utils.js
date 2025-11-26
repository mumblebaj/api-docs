// js/yaml-utils.js

// Debounce utility
export function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(null, args), delay);
  };
}


// Render Markdown function
export function renderMarkdown(md) {
  if (!md) return "";

  let html = md;

  // --- Code blocks -----------------------------------------------------
  html = html.replace(/```([\s\S]*?)```/g, (m, code) => {
    return `<pre class="code-block"><code>${escapeHtml(code)}</code></pre>`;
  });

  // --- Headings (#, ##, ###, ####...) ----------------------------------
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // --- Bold + Italic ---------------------------------------------------
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // --- Inline code -----------------------------------------------------
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // --- Lists -----------------------------------------------------------
  html = html.replace(/^(?:-|\*) (.*)$/gm, "<li>$1</li>");
  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li>[\s\S]*?<\/li>)/gm,
    match => `<ul>${match}</ul>`
  );

  // --- Horizontal rule -------------------------------------------------
  html = html.replace(/^---$/gm, "<hr>");

  // --- Paragraphs ------------------------------------------------------
  // Convert standalone lines into <p>
  html = html.replace(/^(?!<h|<ul|<pre|<li|<p|<hr)([^<\n].*)$/gm, "<p>$1</p>");

  return html;
}

// Escape HTML for safe rendering
function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}



// Parse a YAML line into indent/type/key/value
export function parseYamlLine(lineText) {
  const indent = lineText.match(/^ */)[0].length;
  const trimmed = lineText.trim();

  if (!trimmed) return { type: "empty", indent, key: null, value: null };

  // List item: "- value"
  if (trimmed.startsWith("- ")) {
    const value = trimmed.slice(2).trim();
    return { type: "list-item", indent, key: "(list-item)", value };
  }

  // Key-value pair: "name: value"
  const kv = trimmed.match(/^([^:]+):\s*(.*)$/);
  if (kv) {
    return {
      type: "map",
      indent,
      key: kv[1].trim(),
      value: kv[2].trim(),
    };
  }

  return { type: "scalar", indent, key: null, value: trimmed };
}

// Build breadcrumb-style hierarchy for a given line index
export function getYamlHierarchy(lines, targetLineIndex) {
  const result = [];
  const stack = [];

  for (let i = 0; i <= targetLineIndex; i++) {
    const parsed = parseYamlLine(lines[i]);
    if (parsed.type === "empty") continue;

    const { indent, key, type } = parsed;

    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    stack.push({ indent, key, type });

    if (i === targetLineIndex) {
      for (const node of stack) {
        if (node.key) result.push(node.key);
      }
    }
  }

  return result;
}

export function renderBreadcrumb(hierarchy) {
  if (!hierarchy || hierarchy.length === 0) return "";

  const path = hierarchy.join(" → ");

  return `
---
### 📍 Path
\`${path}\`
`;
}

// Detect scalar type for explanations
export function detectYamlType(value) {
  if (!value || value === "" || value === "null" || value === "~")
    return "null";

  if (value.startsWith("&")) return "anchor";
  if (value.startsWith("*")) return "alias";

  if (/^\d+$/.test(value)) return "integer";
  if (/^\d+\.\d+$/.test(value)) return "float";

  if (/^(true|false)$/i.test(value)) return "boolean";

  if (/^["'].*["']$/.test(value)) return "string (quoted)";

  if (value.startsWith("[")) return "inline list";
  if (value.startsWith("{")) return "inline map";

  if (value === "|" || value === ">") return "multiline block";

  return "string";
}

export function typeHints(type, value) {
  const hints = {
    integer: `
      <p>📘 This is a YAML integer. Quotes are optional.</p>
    `,
    float: `
      <p>📘 This is a floating point number.</p>
    `,
    boolean: `
      <p>📘 Boolean detected.</p>
      <p>⚠️ Remember YAML 1.1 treated "yes/no/on/off" as booleans — avoid ambiguity by quoting.</p>
    `,
    string: `
      <p>📘 This is a plain string.</p>
      <p>💡 Quote strings if they contain special characters.</p>
    `,
    "string (quoted)": `
      <p>📘 Quoted string. Safe and explicit.</p>
    `,
    anchor: `
      <p>📘 This defines a YAML anchor.</p>
      <p><strong>Example:</strong> <code>&myAnchor</code></p>
    `,
    alias: `
      <p>📘 This references an anchor.</p>
      <p><strong>Example:</strong> <code>*myAnchor</code></p>
    `,
    "list-item": `
      <p>📘 This is a YAML list item.</p>
    `,
    "inline list": `
      <p>📘 Inline list: [a, b, c]</p>
    `,
    "inline map": `
      <p>📘 Inline map: {a: 1, b: 2}</p>
    `,
    "multiline block": `
      <p>📘 Multiline string indicator.</p>
      <ul>
        <li><code>|</code> keeps newlines</li>
        <li><code>></code> folds newlines</li>
      </ul>
    `,
    null: `
      <p>📘 Null value. Represented as <code>null</code>, <code>~</code>, or empty.</p>
    `,
  };

  return hints[type] || "";
}

export function explainYamlLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^([^:]+):\s*(.*)$/);
  if (!match) return "";

  const key = match[1].trim();
  const value = match[2].trim() || "(empty)";

  let md = `### 🧩 Node Details

**Key:** \`${key}\`
`;

  // empty
  if (value === "(empty)") {
    md += `**Type:** _none_\n`;
    md += `\n📘 _This key exists but has no assigned value._\n`;
    return md;
  }

  // null
  if (["null", "~", ""].includes(value)) {
    md += `**Type:** \`null\`\n`;
    md += `\n📘 _Null value — represented as_ \`null\`, \`~\`, _or empty._\n`;
    return md;
  }

  // boolean
  if (/^(true|false|yes|no|on|off)$/i.test(value)) {
    md += `**Type:** \`boolean\`\n`;
    md += `\n📘 _YAML 1.1 booleans include \`yes/no/on/off\`. YAML 1.2 restricts booleans to \`true/false\`._\n`;
    return md;
  }

  // number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    md += `**Type:** \`number\`\n`;
    md += `\n📘 _This is parsed as a numeric type._\n`;
    return md;
  }

  // string
  md += `**Type:** \`string\`\n`;
  md += `\n📘 _This is treated as a plain string._\n`;

  return md;
}

// Not currently used, but kept for potential richer UI
export function renderExplanation(key, rawValue, forceType = null) {
  const type = forceType || detectYamlType(rawValue);

  let html = `
    <h3>Node Details</h3>
    <p><strong>Key:</strong> ${escapeHtml(key)}</p>
    <p><strong>Type:</strong> ${type}</p>
  `;

  html += typeHints(type, rawValue);
  return html;
}
