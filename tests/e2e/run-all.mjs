/**
 * NOTE: runs the browser tests one after another, and with --save keeps their full output as dated evidence.
 * Why it exists: each flow is its own script with its own browser, so a full run by hand is six commands per browser.
 * This runs them in order, never stops early, and ends with one table of what passed and what failed.
 * Connects to: the flow-*.mjs files beside it. It expects the production build to be served already, by
 * `npm run e2e:serve` in another terminal, because two flows block requests by the build's file names.
 * Usage: npm run e2e -- [chromium] [firefox] [webkit] [--only=core,catalog] [--base=http://127.0.0.1:4173] [--save]
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

/** Every flow, in the order they run. Each name is the file `flow-<name>.mjs`. */
const FLOWS = ["core", "catalog", "full", "quality", "bonus", "extras"];
const BROWSERS = ["chromium", "firefox", "webkit"];
/** A flow that runs longer than this is stuck, not slow: the longest takes a few minutes. */
const FLOW_TIMEOUT_MS = 20 * 60 * 1000;

const args = process.argv.slice(2);
const here = fileURLToPath(new URL(".", import.meta.url));

/** Stops with a message that says what to do, instead of a stack trace. */
function stop(message) {
  console.error(message);
  process.exit(2);
}

/** Reads a `--name=value` option, or gives the fallback when it wasn't passed. */
function option(name, fallback) {
  const found = args.find((arg) => arg.startsWith(`--${name}=`));
  return found === undefined ? fallback : found.slice(name.length + 3);
}

/** Runs a git command for the results header. Outside a git checkout it says so rather than failing the run. */
function git(...gitArgs) {
  try {
    return execFileSync("git", gitArgs, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const named = args.filter((arg) => !arg.startsWith("--"));
const browsers = named.length === 0 ? ["chromium"] : named;
const flows = option("only", FLOWS.join(",")).split(",").filter(Boolean);
const base = option("base", "http://127.0.0.1:4173");
const save = args.includes("--save");
for (const name of browsers) {
  if (!BROWSERS.includes(name)) stop(`Unknown browser "${name}". Choose from: ${BROWSERS.join(", ")}.`);
}
for (const flow of flows) {
  if (!FLOWS.includes(flow)) stop(`Unknown flow "${flow}". Choose from: ${FLOWS.join(", ")}.`);
}

// The flows would each fail one by one against a server that isn't there, so check once first.
try {
  await fetch(base);
} catch {
  stop(`Nothing answered at ${base}. Start the production build first, in another terminal: npm run e2e:serve`);
}

let playwrightVersion = "unknown";
try {
  playwrightVersion = createRequire(import.meta.url)("playwright/package.json").version;
} catch {
  // Only the header needs it.
}
const commit = git("rev-parse", "--short", "HEAD");
const srcChanged = git("status", "--porcelain", "--", "src") !== "";
// Swedish formatting is simply a way to get "2026-11-10 14:05:09" in the machine's own time zone.
const localTime = new Date().toLocaleString("sv-SE");
const header = [
  `Date: ${localTime} (local time)`,
  `Commit: ${commit}${srcChanged ? " (with uncommitted changes in src)" : ""}`,
  `Base URL: ${base}`,
  `Node: ${process.version}, Playwright: ${playwrightVersion}, OS: ${process.platform}`,
];
console.log(header.join("\n"));

const results = [];
for (const browserName of browsers) {
  for (const flow of flows) {
    const started = Date.now();
    const run = spawnSync(process.execPath, [`${here}flow-${flow}.mjs`, base, browserName], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: FLOW_TIMEOUT_MS,
    });
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    // Every flow ends with a line like "chromium: 73 passed, 0 failed".
    const counts = output.match(/(\d+) passed, (\d+) failed/);
    const result = {
      browserName,
      flow,
      passed: counts ? Number(counts[1]) : 0,
      failed: counts ? Number(counts[2]) : null,
      code: run.status,
      seconds: Math.round((Date.now() - started) / 1000),
      failures: output.split("\n").filter((line) => line.startsWith("FAIL")).slice(0, 5),
      output,
    };
    results.push(result);
    const verdict = counts ? `${result.passed} passed, ${result.failed} failed` : "did not finish";
    console.log(`${browserName.padEnd(8)} ${flow.padEnd(8)} ${verdict} (${result.seconds}s)`);
    for (const line of result.failures) console.log(`  ${line.slice(0, 160)}`);
    if (!counts && /Executable doesn't exist/.test(output)) {
      console.log("  This browser isn't installed. See tests/e2e/README.md: npx playwright install, or PLAYWRIGHT_BROWSERS_PATH.");
    }
  }
}

const allPassed = results.every((result) => result.code === 0 && result.failed === 0);
console.log(allPassed ? "\nEvery flow passed." : "\nAt least one flow failed or didn't finish.");

if (save) {
  const stamp = localTime.slice(0, 16).replace(" ", "_").replace(":", "");
  const folder = `${here}results/${stamp}/`;
  mkdirSync(folder, { recursive: true });
  for (const result of results) {
    writeFileSync(`${folder}${result.browserName}-${result.flow}.log`, `${header.join("\n")}\nBrowser: ${result.browserName}\n\n${result.output}`);
  }
  const rows = results.map((result) =>
    `| ${result.browserName} | ${result.flow} | ${result.passed} | ${result.failed ?? "did not finish"} | ${result.seconds}s |`,
  );
  const summary = [
    "# Browser test results",
    "",
    ...header.map((line) => `- ${line}`),
    "",
    "| Browser | Flow | Passed | Failed | Time |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    allPassed ? "Every flow passed." : "At least one flow failed or didn't finish. The log files beside this one say which checks.",
    "",
  ];
  writeFileSync(`${folder}SUMMARY.md`, summary.join("\n"));
  console.log(`Saved to tests/e2e/results/${stamp}/`);
}

process.exit(allPassed ? 0 : 1);
