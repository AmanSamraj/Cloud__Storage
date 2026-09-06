const { searchResources, toggleStarResource } = require('../services/searchService')

async function search(req, res, next) {
  try {
    const {
      q = '',
      type = 'all',
      owner = 'all',
      starred,
      sortBy = 'updated_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = req.query

    const result = await searchResources({
      userId: req.user.id,
      q,
      type,
      owner,
      starred,
      sortBy,
      sortOrder,
      page,
      limit,
    })

    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function star(req, res, next) {
  try {
    const { resourceType = 'file', resourceId, star = true } = req.body
    if (!resourceId || !['file', 'folder'].includes(resourceType)) {
      return res.status(400).json({ error: 'Valid resourceId and resourceType (file or folder) are required' })
    }

    const result = await toggleStarResource({
      userId: req.user.id,
      resourceType,
      resourceId,
      star: Boolean(star),
    })

    return res.json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = { search, star }
