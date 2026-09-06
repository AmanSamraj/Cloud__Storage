const jwt = require('jsonwebtoken')
const { getSupabaseAdmin } = require('../config/supabase')

async function requireAuth(req, res, next) {
  const token = req.cookies?.access_token

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const payload = jwt.verify(token, getJwtSecret())
    const supabase = getSupabaseAdmin()
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, created_at, updated_at')
      .eq('id', payload.sub)
      .maybeSingle()

    if (error) throw error

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    next(error)
  }
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing JWT_SECRET in backend/.env')
  }

  return process.env.JWT_SECRET
}

module.exports = { requireAuth, getJwtSecret }
