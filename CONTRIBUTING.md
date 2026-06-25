# Contributing to @buildbase/sdk

Thank you for your interest in contributing! This document covers how to set up the project, submit changes, and what we look for in contributions.

## Ways to Contribute

- **Bug reports** — Open an [issue](https://github.com/buildbase-app/sdk/issues) with a clear description and a minimal reproduction
- **Bug fixes** — Fork, fix, and open a PR referencing the issue
- **Documentation** — Fix typos, improve examples, or clarify confusing sections in `README.md`
- **Feature requests** — Open an issue first to discuss before building

> For large features or breaking changes, **always open an issue first** to align before writing code.

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
git clone https://github.com/buildbase-app/sdk.git
cd sdk
npm install
```

### Build

```bash
npm run build
```

### Watch mode (rebuild on change)

```bash
npm run dev
```

### Test locally in another project

This SDK uses [yalc](https://github.com/wclr/yalc) for local linking:

```bash
# Install yalc globally
npm i -g yalc

# Build and push to local yalc store
npm run push:sdk

# In your test project
yalc add @buildbase/sdk

# To watch and auto-push on changes
npm run watch:push
```

### Format code

```bash
npm run format
```

---

## Project Structure

```
src/
├── api/          # API client classes (UserApi, WorkspaceApi, etc.)
├── components/   # React components (gates, forms, providers)
├── hooks/        # React hooks (useSaaSAuth, useSaaSWorkspaces, etc.)
├── context/      # React context providers
├── lib/          # Utilities (formatting, currency, quota helpers)
├── i18n/         # Translation files (en, es, fr, de, ja, zh, hi, ar)
└── types/        # TypeScript types and interfaces
```

---

## Pull Request Guidelines

1. **Branch** off `main` — name your branch `fix/short-description` or `feat/short-description`
2. **Keep PRs small** — one fix or one feature per PR
3. **Format your code** — run `npm run format` before committing
4. **Update the README** if your change adds, removes, or modifies a public API, hook, or component
5. **Write a clear PR description** — what changed, why, and how to test it

---

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add WhenQuotaThreshold component
fix: resolve workspace switch race condition
docs: clarify getSession callback usage
chore: update rollup config
```

---

## Reporting Bugs

Open an issue at [github.com/buildbase-app/sdk/issues](https://github.com/buildbase-app/sdk/issues) and include:

- SDK version (`npm list @buildbase/sdk`)
- React version
- Framework (Next.js, Vite, etc.)
- Minimal code to reproduce the issue
- Expected vs actual behaviour

---

## Questions & Support

- **Email**: [support@buildbase.app](mailto:support@buildbase.app)
- **Docs**: [docs.buildbase.app](https://docs.buildbase.app)
- **Issues**: [github.com/buildbase-app/sdk/issues](https://github.com/buildbase-app/sdk/issues)
