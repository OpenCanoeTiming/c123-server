# @opencanoetiming/c123-contract

Shared wire-contract types and JSON schemas of the C123 server.

- `index.d.ts`: TypeScript declarations only. There is no runtime code and no dependencies.
- `schemas/*.json`: JSON Schemas (`observed`, `error`, `fixture-admitted`), usable as `@opencanoetiming/c123-contract/schemas/observed.schema.json`.

The authority is `docs/arch/CONTRACTS.md` and `docs/arch/schemas/` in the
[c123-server](https://github.com/OpenCanoeTiming/c123-server) repository. A drift test keeps the
declarations equal to the contract text.

```ts
import type { Attempt } from '@opencanoetiming/c123-contract'
```

The package is published to GitHub Packages; pin an exact version.

`schemas.sha256` locks the schema files. A schema edit in `docs/arch/schemas/` requires regenerating it, and that commit is what releases the package: `(cd docs/arch/schemas && sha256sum *.json) > packages/c123-contract/schemas.sha256`
