const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  // Supabase's newer secret key replaces the legacy service-role key name.
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !secretKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env',
    )
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // Node.js 20 does not provide the native WebSocket used by Realtime.
    realtime: { transport: ws },
  })
}

module.exports = { getSupabaseAdmin }
