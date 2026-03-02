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
    if (!parsed.maxLines) {
      throw new Error("Missing maxLines section.");
    }
    return parsed.maxLines;
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

function findOverride(filePath, overrides) {
  if (!Array.isArray(overrides)) return null;
  for (const override of overrides) {
    if (override.file && normalizePath(override.file) === filePath) {
      return override;
    }
    if (override.pattern && globToRegExp(override.pattern).test(filePath)) {
      return override;
    }
  }
  return null;
}

function isExpired(dateText) {
  if (!dateText) return false;
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

const configPath = path.resolve(process.cwd(), getArg("--config", "guardrails.config.json"));
const config = loadConfig(configPath);

const include = Array.isArray(config.include) ? config.include : [];
const exclude = Array.isArray(config.exclude) ? config.exclude : [];
const overrides = Array.isArray(config.overrides) ? config.overrides : [];
const defaultMax = Number.isFinite(config.default) ? config.default : 350;

const allFiles = walkFiles(process.cwd());
const candidates = allFiles
  .map((file) => normalizePath(path.relative(process.cwd(), file)))
  .filter((file) => anyMatch(file, include))
  .filter((file) => !anyMatch(file, exclude));

const violations = [];
const expiredOverrides = [];

for (const file of candidates) {
  const override = findOverride(file, overrides);
  const max = Number.isFinite(override?.max) ? override.max : defaultMax;

  if (override?.expiresOn && isExpired(override.expiresOn)) {
    expiredOverrides.push({
      file,
      expiresOn: override.expiresOn,
      reason: override.reason ?? "No reason provided"
    });
  }

  const fullPath = path.join(process.cwd(), file);
  const content = fs.readFileSync(fullPath, "utf8");
  const lines = content.split(/\r?\n/).length;

  if (lines > max) {
    violations.push({
      file,
      lines,
      max,
      reason: override?.reason ?? null
    });
  }
}

if (expiredOverrides.length > 0) {
  console.error("Expired max-line overrides found:");
  for (const item of expiredOverrides) {
    console.error(`- ${item.file} (expired ${item.expiresOn}): ${item.reason}`);
  }
  console.error("Renew or remove expired overrides before merging.");
}

if (violations.length > 0) {
  console.error("Max line violations:");
  for (const item of violations) {
    const reasonText = item.reason ? ` | reason: ${item.reason}` : "";
    console.error(`- ${item.file}: ${item.lines} lines (max ${item.max})${reasonText}`);
  }
  process.exit(1);
}

if (expiredOverrides.length > 0) {
  process.exit(1);
}

console.log(`check-max-lines passed (${candidates.length} files scanned).`);
