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

**Why exact versions, with no `^`**
So `npm install` gives an evaluator exactly what was tested.

**Why TypeScript 6.0.3 and not the newest**
TypeScript 7 exists, but `typescript-eslint` 8.72 only supports versions below 6.1. On 7, the `lint` script the PRD requires would be out of its supported range.

**Why `engines` says Node 22.22 or newer**
That is the minimum React Router 8 declares.

**Why npm and not pnpm**
The PRD's check is literally `npm install && npm run typecheck && npm run build`, so `package-lock.json` is what gets committed and tested.

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

Its notes are in the file, since YAML allows comments. It runs `npm ci`, `typecheck`, `lint` and `build` on Linux for Node 22, 24 and 26.
