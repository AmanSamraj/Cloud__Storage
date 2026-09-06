const { getSupabaseAdmin } = require('../config/supabase')
const { createLinkShare, resolvePublicLink } = require('../services/linkShareService')
const { requireResourceOwner } = require('../services/shareService')

async function createPublicLink(req, res, next) {
  try {
    const { resourceType, resourceId, password, expiresAt } = req.body
    if (password !== undefined && (typeof password !== 'string' || (password && password.length < 8))) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const result = await createLinkShare({ resourceType, resourceId, password: password || null, expiresAt, userId: req.user.id })
    const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${result.rawToken}`
    return res.status(201).json({ link: { ...result.link, url: publicUrl } })
  } catch (error) {
    next(error)
  }
}

async function getPublicLink(req, res, next) {
  try {
    const password = req.get('x-share-password') || req.query?.password
    return res.json(await resolvePublicLink(req, req.params.token, password))
  } catch (error) {
    next(error)
  }
}

async function deletePublicLink(req, res, next) {
  try {
    const supabase = getSupabaseAdmin()
    const { data: link, error: findError } = await supabase.from('link_shares').select('resource_type, resource_id').eq('id', req.params.id).maybeSingle()
    if (findError) throw findError
    if (!link) return res.status(404).json({ error: 'Public link not found' })

    await requireResourceOwner(link.resource_type, link.resource_id, req.user.id)
    const { error } = await supabase.from('link_shares').delete().eq('id', req.params.id)
    if (error) throw error
    return res.json({ message: 'Public link revoked' })
  } catch (error) {
    next(error)
  }
}

module.exports = { createPublicLink, deletePublicLink, getPublicLink }
