const { getSupabaseAdmin } = require('../config/supabase')
const {
  findUserByEmail,
  getShares,
  requireResourceOwner,
  validateRole,
} = require('../services/shareService')

async function createShare(req, res, next) {
  try {
    const { resourceType, resourceId, granteeEmail, role } = req.body
    if (!['file', 'folder'].includes(resourceType) || !resourceId || !granteeEmail || !validateRole(role)) {
      return res.status(400).json({ error: 'resourceType, resourceId, granteeEmail, and a valid role are required' })
    }

    await requireResourceOwner(resourceType, resourceId, req.user.id)
    const grantee = await findUserByEmail(granteeEmail)
    if (!grantee) return res.status(404).json({ error: 'Registered user not found' })
    if (grantee.id === req.user.id) return res.status(400).json({ error: 'You cannot share with yourself' })

    const supabase = getSupabaseAdmin()
    const { data: share, error } = await supabase
      .from('shares')
      .insert({ resource_type: resourceType, resource_id: resourceId, grantee_user_id: grantee.id, role, created_by: req.user.id })
      .select('id, resource_type, resource_id, grantee_user_id, role, created_by, created_at')
      .single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'User already has access to this resource' })
      throw error
    }

    return res.status(201).json({ share: { ...share, user: grantee } })
  } catch (error) {
    next(error)
  }
}

async function listShares(req, res, next) {
  try {
    await requireResourceOwner(req.params.resourceType, req.params.resourceId, req.user.id)
    return res.json({ shares: await getShares(req.params.resourceType, req.params.resourceId) })
  } catch (error) {
    next(error)
  }
}

async function updateShare(req, res, next) {
  try {
    if (!validateRole(req.body.role)) return res.status(400).json({ error: 'Role must be viewer or editor' })
    const supabase = getSupabaseAdmin()
    const { data: existing, error: findError } = await supabase.from('shares').select('resource_type, resource_id').eq('id', req.params.id).maybeSingle()
    if (findError) throw findError
    if (!existing) return res.status(404).json({ error: 'Share not found' })

    await requireResourceOwner(existing.resource_type, existing.resource_id, req.user.id)
    const { data: share, error } = await supabase.from('shares').update({ role: req.body.role }).eq('id', req.params.id).select('id, resource_type, resource_id, grantee_user_id, role, created_by, created_at').single()
    if (error) throw error
    return res.json({ share })
  } catch (error) {
    next(error)
  }
}

async function deleteShare(req, res, next) {
  try {
    const supabase = getSupabaseAdmin()
    const { data: existing, error: findError } = await supabase.from('shares').select('resource_type, resource_id').eq('id', req.params.id).maybeSingle()
    if (findError) throw findError
    if (!existing) return res.status(404).json({ error: 'Share not found' })

    await requireResourceOwner(existing.resource_type, existing.resource_id, req.user.id)
    const { error } = await supabase.from('shares').delete().eq('id', req.params.id)
    if (error) throw error
    return res.json({ message: 'Access revoked' })
  } catch (error) {
    next(error)
  }
}

module.exports = { createShare, deleteShare, listShares, updateShare }
