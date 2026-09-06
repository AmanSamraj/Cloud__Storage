const { getRecentItems } = require('../services/recentService')

async function listRecent(req, res, next) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50))
    const result = await getRecentItems(req.user.id, limit)
    return res.json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listRecent,
}
