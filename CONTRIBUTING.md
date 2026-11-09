# Contributing

Choose the correct branch before changing files: `main` is the website; `desktop` is the Electron app. Keep pull requests focused and describe the concrete behavior change and validation performed.

## Website

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Use `.env.example` for local frontend configuration. Run development at http://localhost:3000 with `npm run dev`. Use synthetic account, payment, and conversation data for UI checks. Do not make real payments or deploy backend changes as a test.

## Desktop

See [desktop development](https://github.com/Shomesh007/hintio/blob/desktop/docs/DEVELOPMENT.md). Follow the branch's AGENTS.md and existing Lit/Electron patterns. The current UI is JavaScript with Lit; proposed React/TypeScript work is not a completed migration.

## Before opening a pull request

- Run the checks relevant to the changed branch and disclose skipped checks.
- Keep secrets, private context, generated installers, dependencies, and build outputs out of commits.
- Update documentation when capture, storage, permissions, support, or access behavior changes.
- For UI work, check keyboard access, small windows, and the effect of overlay shortcuts.
- Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

Source changes do not automatically update an existing release installer. Windows releases require packaging, runtime verification, and a clean-machine launch check.
