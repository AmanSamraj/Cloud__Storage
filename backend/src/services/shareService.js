const { getSupabaseAdmin } = require('../config/supabase')

const RESOURCE_TABLES = { file: 'files', folder: 'folders' }
const SHARE_ROLES = ['viewer', 'editor']

async function getResource(resourceType, resourceId) {
  const table = RESOURCE_TABLES[resourceType]
  if (!table) return null

  const supabase = getSupabaseAdmin()
  const fields = resourceType === 'file' ? 'id, owner_id, is_deleted' : 'id, owner_id'
  const { data, error } = await supabase.from(table).select(fields).eq('id', resourceId).maybeSingle()
  if (error) throw error
  if (data?.is_deleted) return null
  return data
}

async function requireResourceOwner(resourceType, resourceId, userId) {
  const resource = await getResource(resourceType, resourceId)
  if (!resource) {
    const error = new Error('Resource not found')
    error.statusCode = 404
    throw error
  }

  if (resource.owner_id !== userId) {
    const error = new Error('Only the owner can manage shares')
    error.statusCode = 403
    throw error
  }

  return resource
}

async function findUserByEmail(email) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (error) throw error
  return data
}

async function getShares(resourceType, resourceId) {
  const supabase = getSupabaseAdmin()
  const { data: shares, error } = await supabase
    .from('shares')
    .select('id, resource_type, resource_id, grantee_user_id, role, created_by, created_at')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at')

  if (error) throw error
  if (!shares.length) return []

  const userIds = shares.map((share) => share.grantee_user_id)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, display_name')
    .in('id', userIds)

  if (usersError) throw usersError
  const usersById = new Map(users.map((user) => [user.id, user]))
  return shares.map((share) => ({ ...share, user: usersById.get(share.grantee_user_id) || null }))
}

function validateRole(role) {
  return SHARE_ROLES.includes(role)
}

module.exports = {
  findUserByEmail,
  getResource,
  getShares,
  requireResourceOwner,
  validateRole,
}
