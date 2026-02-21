// js/yaml-doctor.js

// NOTE: expects global YAML (js-yaml) to be loaded via <script>

export function detectDuplicateKeys(text, issues) {
  try {
    YAML.load(text, {
      listener: (op, state) => {
        if (op === "open" && state.kind === "scalar") {
          const line = state.start_mark.line + 1;

          if (state.anchor && state.anchor.duplicates) {
            issues.push(
              `Line ${line}: ❌ Duplicate key: "${state.anchor.value}"`
            );
          }
        }
      },
    });
  } catch (e) {
    // Syntax errors are handled elsewhere
  }
}

export function runYamlDoctor(text) {
  const lines = text.split(/\r?\n/);
  const issues = [];

  // 1. Tabs anywhere
  lines.forEach((line, i) => {
    if (/\t/.test(line)) {
      issues.push(
        `Line ${i + 1}: ❌ Contains TAB character — use spaces only.`
      );
    }
  });

  // 2. Mixed indentation
  lines.forEach((line, i) => {
    if (/^ +\t|^\t+ /.test(line)) {
      issues.push(`Line ${i + 1}: ❌ Mixed indentation (spaces + tabs).`);
    }
  });

  // 3. Indents not multiples of 2
  lines.forEach((line, i) => {
    const indent = line.match(/^ */)[0].length;
    if (indent > 0 && indent % 2 !== 0) {
      issues.push(
        `Line ${
          i + 1
        }: ⚠️ Indentation is ${indent} spaces — expected multiples of 2.`
      );
    }
  });

  // 4. Duplicate keys
  detectDuplicateKeys(text, issues);

  // 5. Ambiguous booleans — now only if pure scalar
  const boolWords = /^(yes|no|y|n|on|off)$/i;

  lines.forEach((line, i) => {
    const m = line.match(/^([^:#]+):\s*(.*)$/);
    if (!m) return;

    const key = m[1].trim();
    const value = m[2].trim();

    if (!value) return;

    // ignore quoted values
    if (/^["'].*["']$/.test(value)) return;

    if (boolWords.test(value)) {
      issues.push(
        `Line ${
          i + 1
        }: ⚠️ Ambiguous boolean '${value}'. Quote it to avoid YAML 1.1 conflicts.`
      );
    }
  });

  // 6. Multiline block indicators spacing (best-practice “| -” case)
  lines.forEach((line, i) => {
    if (/:\s*[>|]-/.test(line)) {
      issues.push(
        `Line ${
          i + 1
        }: ⚠️ Multiline indicator '|' or '>' should be followed by a space (e.g. '| -').`
      );
    }
  });

  return issues;
}
