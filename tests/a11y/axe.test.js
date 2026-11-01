/**
 * @file tests/a11y/axe.test.js
 * @description Automated WCAG 2.2 AA audit using axe-core.
 * Parses real HTML files and runs the full axe ruleset in jsdom.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import axe from "axe-core";

/**
 * Load an HTML file and run axe against it, preserving the html[lang] attribute.
 * @param {string} relPath - Path relative to cwd
 * @returns {Promise<import('axe-core').AxeResults>}
 */
async function runAxeOnFile(relPath) {
  const htmlPath = resolve(process.cwd(), relPath);
  const html = readFileSync(htmlPath, "utf-8");

  // Extract lang from <html> tag before innerHTML assignment strips it
  const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  const lang = langMatch ? langMatch[1] : "en";

  document.documentElement.innerHTML = html;
  document.documentElement.setAttribute("lang", lang);

  return axe.run(document, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"],
    },
  });
}

describe("axe WCAG 2.2 AA audit - landing page (frontend/site)", () => {
  let results;
  beforeEach(async () => {
    results = await runAxeOnFile("frontend/site/index.html");
  });

  it("has zero critical violations", () => {
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      const msgs = critical.map(
        (v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`
      );
      expect.fail(`Critical axe violations:\n${msgs.join('\n')}`);
    }
    expect(critical.length).toBe(0);
  });

  it("has zero serious violations", () => {
    const serious = results.violations.filter((v) => v.impact === "serious");
    if (serious.length > 0) {
      const msgs = serious.map(
        (v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`
      );
      expect.fail(`Serious axe violations:\n${msgs.join('\n')}`);
    }
    expect(serious.length).toBe(0);
  });

  it("passes key WCAG structural rules", () => {
    const passIds = results.passes.map((p) => p.id);
    const required = ["document-title", "html-has-lang"];
    for (const ruleId of required) {
      expect(passIds, `Expected axe rule "${ruleId}" to pass`).toContain(ruleId);
    }
  });
});

describe("axe WCAG 2.2 AA audit - planner app (frontend/app)", () => {
  let results;
  beforeEach(async () => {
    results = await runAxeOnFile("frontend/app/index.html");
  });

  it("has zero critical violations", () => {
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      const msgs = critical.map(
        (v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`
      );
      expect.fail(`Critical axe violations:\n${msgs.join('\n')}`);
    }
    expect(critical.length).toBe(0);
  });

  it("has zero serious violations", () => {
    const serious = results.violations.filter((v) => v.impact === "serious");
    if (serious.length > 0) {
      const msgs = serious.map(
        (v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`
      );
      expect.fail(`Serious axe violations:\n${msgs.join('\n')}`);
    }
    expect(serious.length).toBe(0);
  });
});