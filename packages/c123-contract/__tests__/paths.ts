import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const PKG_DIR = resolve(here, '..')
export const ROOT = resolve(PKG_DIR, '../..')
export const CONTRACTS_MD = resolve(ROOT, 'docs/arch/CONTRACTS.md')
export const SCHEMAS_DIR = resolve(ROOT, 'docs/arch/schemas')
export const TSC = resolve(ROOT, 'node_modules/typescript/bin/tsc')
export const SCHEMA_FILES = ['error.schema.json', 'fixture-admitted.schema.json', 'observed.schema.json'] as const
