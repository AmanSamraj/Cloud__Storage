const { createHash, randomBytes } = require('node:crypto')
const bcrypt = require('bcrypt')
const { getSupabaseAdmin } = require('../config/supabase')
const { getResource, requireResourceOwner } = require('./shareService')

const STORAGE_BUCKET = 'drive'
const LINK_TTL_SECONDS = 60
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_PASSWORD_ATTEMPTS = 5
const passwordAttempts = new Map()

function createRawToken() {
  return randomBytes(32).toString('base64url')
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function getAttemptKey(req, tokenHash) {
  const ip = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1'
  return `${ip}:${tokenHash}`
}

function isRateLimited(key) {
  const record = passwordAttempts.get(key)
  if (!record || Date.now() - record.startedAt >= ATTEMPT_WINDOW_MS) {
    passwordAttempts.delete(key)
    return false
  }
  return record.count >= MAX_PASSWORD_ATTEMPTS
}

function recordFailedAttempt(key) {
  const record = passwordAttempts.get(key)
  if (!record || Date.now() - record.startedAt >= ATTEMPT_WINDOW_MS) {
    passwordAttempts.set(key, { count: 1, startedAt: Date.now() })
  } else {
    record.count += 1
  }
}

function clearAttempts(key) {
  passwordAttempts.delete(key)
}

async function createLinkShare({ resourceType, resourceId, password, expiresAt, userId }) {
  if (resourceType !== 'file') {
    const error = new Error('Public links currently support files only')
    error.statusCode = 400
    throw error
  }

  const resource = await requireResourceOwner(resourceType, resourceId, userId)
  let expiry = null
  if (expiresAt) {
    expiry = new Date(expiresAt)
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      const error = new Error('Expiry must be a valid future date')
      error.statusCode = 400
      throw error
    }
  }

  const rawToken = createRawToken()
  const supabase = getSupabaseAdmin()
  const { data: link, error } = await supabase
    .from('link_shares')
    .insert({
      resource_type: resourceType,
      resource_id: resourceId,
      token: hashToken(rawToken),
      role: 'viewer',
      password_hash: password ? await bcrypt.hash(password, 12) : null,
      expires_at: expiry?.toISOString() || null,
      created_by: userId,
    })
    .select('id, resource_type, resource_id, role, expires_at, created_at')
    .single()

  if (error) throw error
  return { link, rawToken, resource }
}

async function resolvePublicLink(req, token, password) {
  const tokenHash = hashToken(token)
  const supabase = getSupabaseAdmin()
  const { data: link, error } = await supabase
    .from('link_shares')
    .select('id, resource_type, resource_id, token, role, password_hash, expires_at')
    .eq('token', tokenHash)
    .maybeSingle()

  if (error) throw error
  if (!link || (link.expires_at && new Date(link.expires_at) <= new Date())) {
    const notFound = new Error('Link is invalid or expired')
    notFound.statusCode = 404
    throw notFound
  }

  const attemptKey = getAttemptKey(req, tokenHash)
  if (link.password_hash) {
    if (isRateLimited(attemptKey)) {
      const limited = new Error('Too many password attempts. Try again later.')
      limited.statusCode = 429
      throw limited
    }

    if (!password || !(await bcrypt.compare(password, link.password_hash))) {
      recordFailedAttempt(attemptKey)
      const invalid = new Error(password ? 'Incorrect password' : 'Password required')
      invalid.statusCode = 401
      throw invalid
    }

    clearAttempts(attemptKey)
  }

  const resource = await getResource(link.resource_type, link.resource_id)
  if (!resource) {
    const missing = new Error('Shared file is no longer available')
    missing.statusCode = 404
    throw missing
  }

  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('id, name, mime_type, size_bytes, updated_at, storage_path')
    .eq('id', resource.id)
    .single()
  if (fileError) throw fileError

  const { data: signed, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, LINK_TTL_SECONDS, { download: file.name })
  if (signedError) {
    const storageError = new Error(`Could not create public download URL: ${signedError.message}`)
    storageError.statusCode = 502
    throw storageError
  }

  return {
    file: { id: file.id, name: file.name, mimeType: file.mime_type, sizeBytes: file.size_bytes, updatedAt: file.updated_at },
    url: signed.signedUrl,
    expiresIn: LINK_TTL_SECONDS,
  }
}

module.exports = { createLinkShare, resolvePublicLink }
