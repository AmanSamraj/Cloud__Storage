const {
  addStar,
  getStarredItems,
  removeStar,
} = require('../services/starService')

async function starResource(req, res, next) {
  try {
    const { resourceType, resourceId } = req.body
    if (!resourceId || !['file', 'folder'].includes(resourceType)) {
      return res.status(400).json({ error: 'Valid resourceType ("file" or "folder") and resourceId are required' })
    }

    const result = await addStar({
      userId: req.user.id,
      resourceType,
      resourceId,
    })

    return res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

async function unstarResource(req, res, next) {
  try {
    const resourceType = req.body?.resourceType || req.query?.resourceType || req.params?.resourceType
    const resourceId = req.body?.resourceId || req.query?.resourceId || req.params?.resourceId

    if (!resourceId || !['file', 'folder'].includes(resourceType)) {
      return res.status(400).json({ error: 'Valid resourceType ("file" or "folder") and resourceId are required' })
    }

    const result = await removeStar({
      userId: req.user.id,
      resourceType,
      resourceId,
    })

    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function listStarred(req, res, next) {
  try {
    const result = await getStarredItems(req.user.id)
    return res.json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listStarred,
  starResource,
  unstarResource,
}
