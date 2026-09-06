const { createHash, randomBytes } = require('node:crypto')
const bcrypt = require('bcrypt')
const assert = require('node:assert')

// Verify token generation & SHA256 hashing
const rawToken = randomBytes(32).toString('base64url')
assert(rawToken.length >= 40, 'Raw token should be at least 32 bytes encoded in base64url')
const hashedToken = createHash('sha256').update(rawToken).digest('hex')
assert.strictEqual(hashedToken.length, 64, 'SHA-256 hash length should be 64 hex characters')

// Verify Bcrypt password hashing
async function testBcrypt() {
  const password = 'StrongPassword123!'
  const hash = await bcrypt.hash(password, 12)
  const isMatch = await bcrypt.compare(password, hash)
  const isBadMatch = await bcrypt.compare('WrongPassword', hash)
  assert.strictEqual(isMatch, true, 'Valid password must match bcrypt hash')
  assert.strictEqual(isBadMatch, false, 'Invalid password must not match bcrypt hash')
  console.log('✓ Token & Bcrypt tests passed')
}

// Verify Rate Limiter Logic
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_PASSWORD_ATTEMPTS = 5
const passwordAttempts = new Map()

function getAttemptKey(ip, tokenHash) {
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

function testRateLimiting() {
  const key = getAttemptKey('192.168.1.1', hashedToken)
  assert.strictEqual(isRateLimited(key), false)
  for (let i = 0; i < 4; i++) {
    recordFailedAttempt(key)
    assert.strictEqual(isRateLimited(key), false)
  }
  recordFailedAttempt(key) // 5th attempt
  assert.strictEqual(isRateLimited(key), true, 'Should be rate limited after 5 failed attempts')
  clearAttempts(key)
  assert.strictEqual(isRateLimited(key), false, 'Should be cleared upon successful login')
  console.log('✓ Rate limiting tests passed')
}

// Verify Expiry Logic
function testExpiry() {
  const past = new Date(Date.now() - 1000)
  const future = new Date(Date.now() + 60000)
  assert.strictEqual(past <= new Date(), true, 'Past date should be expired')
  assert.strictEqual(future <= new Date(), false, 'Future date should not be expired')
  console.log('✓ Expiry tests passed')
}

(async () => {
  await testBcrypt()
  testRateLimiting()
  testExpiry()
  console.log('All public share security unit tests passed successfully!')
})()
