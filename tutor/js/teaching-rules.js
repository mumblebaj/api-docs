// teaching-rules.js — pure "what to teach" logic
// Returns an array of issues: { line: number (0-based), tip: string }

/**
 * Main entry: analyse the YAML text and return teaching issues.
 * This is deliberately conservative: only a couple of high-value rules
 * so we don't spam the user.
 */
export function detectTeachingIssues(yamlText) {
  if (!yamlText || typeof yamlText !== "string") return [];

  const lines = yamlText.split(/\r?\n/);
  const issues = [];

  addMissingComponentDescriptionIssues(lines, issues);
  addMissingSchemaTypeIssues(lines, issues);

  return issues;
}

/**
 * RULE 1 — Missing description ONLY for components.* members
 *
 * Detect things like:
 * components:
 *   schemas:
 *     Payment:      <-- we want a description inside this block
 *       type: object
 */
function addMissingComponentDescriptionIssues(lines, issues) {
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const indent = raw.match(/^ */)[0].length;

    // Look at the previous line to see if we're under a component section
    // e.g. "schemas:", "responses:", "examples:", "requestBodies:", "parameters:"
    const parentLine = i > 0 ? lines[i - 1].trim() : "";
    const isComponentSection = /^(schemas|responses|parameters|examples|requestBodies):$/i.test(
      parentLine
    );

    // Component members look like:
    //   schemas:
    //     Payment:
    const isComponentItem =
      indent === 4 && /^[A-Za-z0-9_-]+:$/i.test(trimmed) && isComponentSection;

    if (!isComponentItem) continue;

    // Scan forward within this component block for "description:"
    const blockIndent = indent;
    let foundDescription = false;

    for (let j = i + 1; j < lines.length; j++) {
      const nextIndent = lines[j].match(/^ */)[0].length;

      // Once we de-indent to the same or less, we've left this component
      if (nextIndent <= blockIndent) break;

      if (lines[j].trim().startsWith("description:")) {
        foundDescription = true;
        break;
      }
    }

    if (!foundDescription) {
      issues.push({
        line: i,
        tip:
          "💡 **Teaching Tip:**\n" +
          "This component is missing a `description:` field. " +
          "Add one to document its purpose for consumers of your API.",
      });
    }
  }
}

/**
 * RULE 2 — `schema:` blocks without a `type:`
 *
 * Detect:
 *   schema:
 *     properties:
 *       ...
 * and suggest adding type: object/string/etc.
 */
function addMissingSchemaTypeIssues(lines, issues) {
  lines.forEach((line, i) => {
    if (line.trim() !== "schema:") return;

    const indent = line.match(/^ */)[0].length;
    let foundType = false;

    // Look inside this schema: block for a type: at deeper indent
    for (let j = i + 1; j < lines.length; j++) {
      const nextIndent = lines[j].match(/^ */)[0].length;

      // Leaving the block
      if (nextIndent <= indent) break;

      if (lines[j].trim().startsWith("type:")) {
        foundType = true;
        break;
      }
    }

    if (!foundType) {
      issues.push({
        line: i,
        tip:
          "💡 **Teaching Tip:**\n" +
          "Schemas should specify a `type:` (e.g. `object`, `string`, `integer`). " +
          "This helps tools and humans understand how the data is structured.",
      });
    }
  });
}
