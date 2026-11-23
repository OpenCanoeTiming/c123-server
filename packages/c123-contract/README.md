# @opencanoetiming/c123-contract

Shared wire-contract types and JSON schemas of the C123 server.

- `index.d.ts`: TypeScript declarations only. There is no runtime code and no dependencies.
- `schemas/*.json`: JSON Schemas (`observed.schema.json`, `error.schema.json`, `fixture-admitted.schema.json`), usable as `@opencanoetiming/c123-contract/schemas/observed.schema.json`.

The authority is `docs/arch/CONTRACTS.md` and `docs/arch/schemas/` in the
[c123-server](https://github.com/OpenCanoeTiming/c123-server) repository. A drift test keeps the
declarations equal to the contract text.

```ts
import type { Attempt } from '@opencanoetiming/c123-contract'
```

## Install

The package is published to GitHub Packages, which answers 401 without a token even for a public
package. Point the scope at that registry in the client's `.npmrc`:

```
@opencanoetiming:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`NODE_AUTH_TOKEN` is a classic personal access token with `read:packages`; the npm registry of
GitHub Packages does not take fine-grained tokens. In CI it is a repository secret that the workflow
exposes as the `NODE_AUTH_TOKEN` environment variable of the job that runs `npm ci` (at job level, so
that `actions/setup-node`'s cache step sees it too). Pin an exact version (no `^` or `~`) in
`package.json`.

`schemas.sha256` locks the schema files. A schema edit in `docs/arch/schemas/` requires regenerating it, and that commit is what releases the package: `(cd docs/arch/schemas && sha256sum *.json) > packages/c123-contract/schemas.sha256`
