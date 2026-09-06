const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { getSupabaseAdmin } = require('../config/supabase')
const { getJwtSecret } = require('../middleware/authMiddleware')

const COOKIE_NAME = 'access_token'
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email)
    const password = req.body.password
    const displayName = normalizeDisplayName(req.body.displayName)

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const supabase = getSupabaseAdmin()
    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash, display_name: displayName })
      .select('id, email, display_name, avatar_url, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email is already registered' })
      }

      throw error
    }

    setAuthCookie(res, user.id)
    return res.status(201).json({ user })
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email)
    const password = req.body.password

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const supabase = getSupabaseAdmin()
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, display_name, avatar_url, created_at, updated_at')
      .eq('email', email)
      .maybeSingle()

    if (error) throw error

    const passwordMatches = user
      ? await bcrypt.compare(password, user.password_hash)
      : false

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    delete user.password_hash
    setAuthCookie(res, user.id)
    return res.json({ user })
  } catch (error) {
    next(error)
  }
}

function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, getCookieOptions())
  return res.json({ message: 'Logged out successfully' })
}

function me(req, res) {
  return res.json({ user: req.user })
}

function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, getJwtSecret(), {
    expiresIn: '1d',
  })

  res.cookie(COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: TOKEN_MAX_AGE_MS,
  })
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizeDisplayName(value) {
  if (typeof value !== 'string') return null
  const name = value.trim()
  return name ? name.slice(0, 100) : null
}

module.exports = { register, login, logout, me }
