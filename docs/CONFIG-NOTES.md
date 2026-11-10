# Config notes

Every source file in this project has its notes inside it. JSON files can't hold comments, so these
are explained here. `tsconfig.json` allows comments, so its notes are in the file.

## `package.json`

**Scripts**
- `dev` starts Vite's development server.
- `build` runs `tsc --noEmit` first, then `vite build`. Vite strips types without checking them, so without the first step a type error could still reach production. This also stops Vercel from deploying code with type errors.
- `typecheck` is the PRD's required command. It must finish with 0 errors.
- `lint` runs ESLint. `any` is an error, so it can't stay in the code.
- `preview` serves the production build, which is what the end-to-end checks run against.
- `test` runs the unit tests in `tests/unit` once, as CI does. `test:watch` re-runs them whenever a file changes.

**Why exact versions, with no `^`**
So `npm install` gives an evaluator exactly what was tested.

**Why TypeScript 6.0.3 and not the newest**
TypeScript 7 exists, but `typescript-eslint` 8.72 only supports versions below 6.1. On 7, the `lint` script the PRD requires would be out of its supported range.

**Why Vitest 5.0.5 for the unit tests**
- **It reads `vite.config.ts`,** so the tests resolve the `@/` alias exactly as the app does, with no second config to keep in step.
- **It supports Vite 8 and Node 22, 24 and 26**, the versions CI uses.
- **5.0.5, not the newest 5.1.0.** 5.1.0 was only eight days old when this was set up, and an older release that nobody has reported problems with is the safer pin.
- **No browser environment.** The tests cover pure logic, so they run in plain Node, with no jsdom or happy-dom.

**Why `engines` says Node 22.22 or newer**
That is the minimum React Router 8 declares.

**Why npm and not pnpm**
The PRD's check is literally `npm install && npm run typecheck && npm run build`, so `package-lock.json` is what gets committed and tested.

**Why `overrides` forces `minimatch` to 11.0.4**
ESLint depends on an older `minimatch` with a known denial-of-service advisory (GHSA-g3hv-75wg-m249), which made `npm install` report 10 moderate vulnerabilities. It only runs on our own machines and never reaches the site, but it is one line to fix. ESLint was re-run with the override to confirm it still works and still rejects `any`.

## `package-lock.json`

Written by npm. It records the exact version of every package, including the packages our packages depend on. `npm ci` in CI installs precisely this list.

## `vercel.json`

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**What it does:** sends every URL to `index.html`.

**Why it exists:** this is a single-page app, so there is one real HTML file and React Router draws each page in the browser. When you click a link, Router handles it and the server isn't involved. But when you reload `/products/5` or open it directly, the browser asks the server for that path, and no such file exists.

**What breaks without it:** that reload gives a 404 from Vercel. The PRD tests this exact case.

## `.github/workflows/ci.yml`

Its notes are in the file, since YAML allows comments. It runs `npm ci`, `typecheck`, `lint`, the unit tests and `build` on Linux for Node 22, 24 and 26.
