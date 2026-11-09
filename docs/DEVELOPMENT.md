# Desktop development

This branch contains the Electron desktop application. The website is maintained separately on `main`.

## Install and run

Use Node.js 22 LTS and npm on the target platform. Clone the desktop branch and restore dependencies:

```sh
git clone --branch desktop https://github.com/Shomesh007/hintio.git
cd hintio
npm ci
npm start
```

The entry screen expects a valid access token. API integrations, capture permissions, network access, and model availability depend on your configuration. Never put credentials into tracked files.

## Source map

- `src/index.js`: Electron main process and IPC handlers.
- `src/preload.js`: renderer bridge.
- `src/components/`: Lit-based views and application shell.
- `src/storage.js`: local JSON configuration and history.
- `src/utils/`: providers, validation, capture helpers, and support contacts.
- `test/`: Node test-runner checks.
- `forge.config.js`: packaging and runtime inclusion.

The UI currently uses JavaScript and Lit. React/TypeScript migration notes are future direction, not the current architecture.

## Checks

```sh
npm test
npm run typecheck
```

`typecheck` currently syntax-checks JavaScript; it is not TypeScript type checking. `lint` currently prints that linting is not configured.

## Windows distribution

Build on Windows with the required platform toolchain and VC++ runtime DLLs available:

```sh
npm run make:win
```

This runs Electron Forge and the Windows runtime-file verifier. Distribute the complete installer from `out/make/squirrel.windows/x64/` or portable ZIP from `out/make/zip/win32/x64/`. A standalone copy of Hintio.exe is incomplete.

Signing is optional in configuration via `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`; signing keys must remain private. Optional prerequisites in `build/windows/` are included when present. An unsigned build can trigger Windows trust warnings.

Before publishing, test installation and launch in a clean Windows environment. Check capture permissions, session startup, overlay movement and click-through, history, and contact links. Test deletion controls with disposable configuration only. Packaging verification alone does not prove these flows work.

Do not commit `node_modules`, `out`, credentials, user history, private profiles, certificates, or environment secrets. Cache removal can require dependency downloads again; it must not remove source or installed toolchains.
