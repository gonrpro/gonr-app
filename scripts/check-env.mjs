#!/usr/bin/env node
/**
 * Required environment contract for GONR builds/smokes.
 * Prints names only. Never prints values.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const target = process.argv[2] || process.env.GONR_ENV_TARGET || 'local'
const root = process.cwd()

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const [key, ...rest] = line.split('=')
    out[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
  }
  return out
}

const localEnv = loadEnvFile(join(root, '.env.local'))
const credentialEnv = loadEnvFile(`${process.env.HOME}/.openclaw/credentials/supabase`)

const aliases = {
  NEXT_PUBLIC_SUPABASE_URL: ['SUPABASE_URL'],
  SUPABASE_SERVICE_ROLE_KEY: ['SUPABASE_SERVICE_KEY'],
}

const requiredByTarget = {
  local: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'LEMONSQUEEZY_WEBHOOK_SECRET',
  ],
  ci: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'LEMONSQUEEZY_WEBHOOK_SECRET',
  ],
  preview: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'LEMONSQUEEZY_WEBHOOK_SECRET',
  ],
  prod: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'LEMONSQUEEZY_WEBHOOK_SECRET',
    'LS_SPOTTER_VARIANT_ID',
    'LS_OPERATOR_VARIANT_ID',
    'LS_SBPRO_VARIANT_ID',
    'LS_PLANT_BRAIN_RUNTIME_VARIANT_ID',
  ],
}

if (!requiredByTarget[target]) {
  console.error(`Unknown env target: ${target}`)
  console.error(`Use one of: ${Object.keys(requiredByTarget).join(', ')}`)
  process.exit(2)
}

function hasEnv(name) {
  if (process.env[name] || localEnv[name] || credentialEnv[name]) return true
  for (const alias of aliases[name] || []) {
    if (process.env[alias] || localEnv[alias] || credentialEnv[alias]) return true
  }
  return false
}

const missing = requiredByTarget[target].filter(name => !hasEnv(name))

console.log(`GONR env contract: ${target}`)
for (const name of requiredByTarget[target]) {
  console.log(`${hasEnv(name) ? '✅' : '❌'} ${name}`)
}

if (missing.length) {
  console.error(`Missing required env for ${target}: ${missing.join(', ')}`)
  process.exit(1)
}
