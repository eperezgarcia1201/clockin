#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function escapeRegexChar(char) {
  return /[|\\{}()[\]^$+?.]/.test(char) ? `\\${char}` : char;
}

function globToRegExp(glob) {
  let result = "^";

  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    const next = glob[i + 1];

    if (char === "*") {
      if (next === "*") {
        i += 1;
        if (glob[i + 1] === "/") i += 1;
        result += ".*";
      } else {
        result += "[^/]*";
      }
      continue;
    }

    if (char === "?") {
      result += "[^/]";
      continue;
    }

    if (char === "{") {
      const end = glob.indexOf("}", i + 1);
      if (end !== -1) {
        const segment = glob.slice(i + 1, end);
        const options = segment
          .split(",")
          .map((part) => part.split("").map(escapeRegexChar).join(""))
          .join("|");
        result += `(${options})`;
        i = end;
        continue;
      }
    }

    result += escapeRegexChar(char);
  }

  result += "$";
  return new RegExp(result);
}

function loadConfig(configPath) {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.noDirectFetch) {
      throw new Error("Missing noDirectFetch section.");
    }
    return parsed.noDirectFetch;
  } catch (error) {
    console.error(`Failed loading config at ${configPath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function walkFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  const skipDirs = new Set([
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    ".next",
    "dist",
    "build",
    "coverage"
  ]);

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function anyMatch(filePath, patterns) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((pattern) => globToRegExp(pattern).test(filePath));
}

function compileBlockedPatterns(rawPatterns) {
  const patterns = Array.isArray(rawPatterns) ? rawPatterns : [];
  return patterns.map((patternText) => {
    try {
      return {
        text: patternText,
        regex: new RegExp(patternText)
      };
    } catch (error) {
      console.error(`Invalid blocked regex pattern: ${patternText}`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
}

function firstViolationInFile(content, blockedPatterns) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index];
    for (const pattern of blockedPatterns) {
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(lineText)) {
        return {
          line: index + 1,
          pattern: pattern.text,
          snippet: lineText.trim().slice(0, 140)
        };
      }
    }
  }
  return null;
}

const configPath = path.resolve(process.cwd(), getArg("--config", "guardrails.config.json"));
const config = loadConfig(configPath);

const include = Array.isArray(config.include) ? config.include : [];
const exclude = Array.isArray(config.exclude) ? config.exclude : [];
const allowIn = Array.isArray(config.allowIn) ? config.allowIn.map(normalizePath) : [];
const message = config.message ?? "Direct network calls are not allowed in this scope.";
const blockedPatterns = compileBlockedPatterns(config.blockedPatterns);

const allFiles = walkFiles(process.cwd());
const candidates = allFiles
  .map((file) => normalizePath(path.relative(process.cwd(), file)))
  .filter((file) => anyMatch(file, include))
  .filter((file) => !anyMatch(file, exclude))
  .filter((file) => !allowIn.includes(file));

const violations = [];

for (const file of candidates) {
  const fullPath = path.join(process.cwd(), file);
  const content = fs.readFileSync(fullPath, "utf8");
  const violation = firstViolationInFile(content, blockedPatterns);
  if (violation) {
    violations.push({
      file,
      ...violation
    });
  }
}

if (violations.length > 0) {
  console.error("Direct network call violations:");
  for (const item of violations) {
    console.error(`- ${item.file}:${item.line} matched /${item.pattern}/`);
    if (item.snippet) {
      console.error(`  ${item.snippet}`);
    }
  }
  console.error(message);
  process.exit(1);
}

console.log(`check-no-direct-fetch passed (${candidates.length} files scanned).`);
