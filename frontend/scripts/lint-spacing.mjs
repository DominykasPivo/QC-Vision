import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");

const TARGET_EXTENSIONS = new Set([".ts", ".tsx"]);

const spacingStylePattern =
  /style\s*=\s*\{\{[\s\S]*?\b(?:margin|padding|gap)(?:Top|Right|Bottom|Left|Inline|Block|X|Y)?\s*:/g;
const classNameLiteralPattern =
  /className\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|\{\s*`([^`]*)`\s*\}|\{\s*\"([^\"]*)\"\s*\}|\{\s*'([^']*)'\s*\})/g;
const legacyClassTokenPattern =
  /^(?:btn(?:-[\w-]+)?|form-(?:input|select|group|label)|page|page-title|page-description|back-link|details-(?:section|section-title|placeholder)|defect-[\w-]+|audit-[\w-]+|gallery-[\w-]+)$/;
const arbitrarySpacingPattern =
  /(?:^|[\s'"`])(?:-?m(?:t|r|b|l|x|y)?|p(?:t|r|b|l|x|y)?|gap(?:-x|-y)?|space-(?:x|y))-\[[^\]]+\]/g;

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function reportMatch(filePath, source, match, label, findings) {
  findings.push({
    filePath,
    line: lineAt(source, match.index ?? 0),
    label,
    snippet: match[0].replace(/\s+/g, " ").trim().slice(0, 180),
  });
}

function firstDefined(values) {
  for (const value of values) {
    if (value !== undefined) {
      return value;
    }
  }
  return "";
}

async function main() {
  const files = await collectFiles(SRC_ROOT);
  const findings = [];

  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8");

    for (const match of source.matchAll(spacingStylePattern)) {
      reportMatch(filePath, source, match, "inline spacing style", findings);
    }

    for (const match of source.matchAll(classNameLiteralPattern)) {
      const classLiteral = firstDefined(match.slice(1)).replace(
        /\$\{[^}]+\}/g,
        " ",
      );
      const tokens = classLiteral.split(/\s+/).filter(Boolean);
      const legacyToken = tokens.find((token) =>
        legacyClassTokenPattern.test(token),
      );

      if (!legacyToken) {
        continue;
      }

      findings.push({
        filePath,
        line: lineAt(source, match.index ?? 0),
        label: "legacy class usage",
        snippet: `className token "${legacyToken}"`,
      });
    }

    for (const match of source.matchAll(arbitrarySpacingPattern)) {
      reportMatch(
        filePath,
        source,
        match,
        "arbitrary spacing utility",
        findings,
      );
    }
  }

  if (findings.length > 0) {
    console.error(`Spacing lint failed with ${findings.length} issue(s):`);
    for (const finding of findings) {
      console.error(
        `${path.relative(ROOT, finding.filePath)}:${finding.line} ${finding.label} -> ${finding.snippet}`,
      );
    }
    process.exit(1);
  }

  console.log("Spacing lint passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
