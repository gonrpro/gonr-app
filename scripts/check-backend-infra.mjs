#!/usr/bin/env node
/**
 * GONR backend infra preflight.
 * Safe-by-default: validates presence/connectivity without printing secrets.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const failures = []
const warnings = []
const oks = []

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
const supabaseCreds = loadEnvFile(`${process.env.HOME}/.openclaw/credentials/supabase`)

function env(name, aliases = []) {
  for (const key of [name, ...aliases]) {
    const value = process.env[key] || localEnv[key] || supabaseCreds[key]
    if (value) return value
  }
  return ''
}

function required(name, aliases = []) {
  const value = env(name, aliases)
  if (value) oks.push(`env:${name}`)
  else failures.push(`missing env:${name}`)
  return value
}

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL', ['SUPABASE_URL'])
const anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
required('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_SERVICE_KEY'])
required('OPENAI_API_KEY')

const migrationsDir = join(root, 'supabase', 'migrations')
if (existsSync(migrationsDir)) {
  const migrationCount = readFileSync ? spawnSync('find', [migrationsDir, '-maxdepth', '1', '-type', 'f', '-name', '*.sql'], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean).length : 0
  if (migrationCount > 0) oks.push(`supabase:migrations:${migrationCount}`)
  else warnings.push('supabase:migrations directory exists but has no .sql files')
} else {
  failures.push('missing supabase/migrations')
}

if (existsSync(join(root, 'vercel.json'))) oks.push('vercel:config-present')
else warnings.push('missing vercel.json')

function commandWorks(command, args, okLabel, warnLabel) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 20_000 })
  if (result.status === 0) oks.push(okLabel)
  else warnings.push(`${warnLabel}: ${(result.stderr || result.stdout || '').split('\n')[0] || 'unavailable'}`)
}

commandWorks('supabase', ['projects', 'list'], 'supabase:cli-auth', 'supabase CLI auth not verified')
commandWorks('vercel', ['whoami'], 'vercel:cli-auth', 'vercel CLI auth not verified')

if (supabaseUrl && anonKey) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok || res.status === 401 || res.status === 404) oks.push(`supabase:rest-reachable:${res.status}`)
    else failures.push(`supabase:rest-unhealthy:${res.status}`)
  } catch (err) {
    failures.push(`supabase:rest-unreachable:${err?.name || 'error'}`)
  }
}

console.log('GONR backend infra preflight')
for (const item of oks) console.log(`✅ ${item}`)
for (const item of warnings) console.log(`⚠️  ${item}`)
for (const item of failures) console.log(`❌ ${item}`)

if (failures.length) process.exit(1)
