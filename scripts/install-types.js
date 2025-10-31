#!/usr/bin/env node
import { execSync } from 'node:child_process'

function run(command) {
  execSync(command, { stdio: 'inherit', env: process.env })
}

function getDistTags() {
  try {
    const output = execSync('npm view @everylanguage/shared-types dist-tags --json', {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })
      .toString()
      .trim()
    if (!output) return {}
    const parsed = JSON.parse(output)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function devTagAvailable() {
  const tags = getDistTags()
  return typeof tags.dev === 'string' && tags.dev.length > 0
}

const vercelEnv = process.env.VERCEL_ENV // 'production' | 'preview' | 'development' (on vercel)
const isLocalFlag = process.argv.includes('--local')

// Use dev-tagged shared types on Vercel preview builds or when explicitly requested locally
const shouldUseDevTypes = vercelEnv === 'preview' || isLocalFlag || process.env.IS_PREVIEW === 'true'
const canUseDev = devTagAvailable()

if (vercelEnv) {
  if (shouldUseDevTypes && canUseDev) {
    console.log('[install-types] Vercel preview: installing baseline deps with npm ci, then overriding @everylanguage/shared-types to dev tag')
    run('npm ci')
    run('npm i @everylanguage/shared-types@dev --no-save --no-package-lock')
  } else {
    if (shouldUseDevTypes && !canUseDev) {
      console.log('[install-types] Vercel preview requested dev types, but dev dist-tag not found. Proceeding with stable lockfile (npm ci).')
    } else {
      console.log('[install-types] Vercel production/development: using lockfile (npm ci)')
    }
    run('npm ci')
  }
} else if (isLocalFlag) {
  if (canUseDev) {
    console.log('[install-types] Local flag: installing @everylanguage/shared-types@dev without persisting')
    run('npm i @everylanguage/shared-types@dev --no-save --no-package-lock')
  } else {
    console.log('[install-types] Local flag requested dev types, but dev dist-tag not found. Using currently installed stable types.')
  }
} else {
  console.log('[install-types] Local environment detected; no changes applied')
}


