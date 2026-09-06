const {
  emptyUserTrash,
  getTrashItems,
  permanentDeleteResource,
  restoreTrashItem,
} = require('../services/trashService')

async function listTrash(req, res, next) {
  try {
    const result = await getTrashItems(req.user.id)
    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function restore(req, res, next) {
  try {
    const { resourceType, resourceId } = req.body
    if (!resourceId || !['file', 'folder'].includes(resourceType)) {
      return res.status(400).json({ error: 'Valid resourceId and resourceType ("file" or "folder") are required' })
    }

    const result = await restoreTrashItem({
      userId: req.user.id,
      resourceType,
      resourceId,
    })

    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function permanentDelete(req, res, next) {
  try {
    const { resourceType, id } = req.params
    if (!id || !['file', 'folder'].includes(resourceType)) {
      return res.status(400).json({ error: 'Valid id and resourceType ("file" or "folder") are required' })
    }

    const result = await permanentDeleteResource({
      userId: req.user.id,
      resourceType,
      resourceId: id,
    })

    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function emptyTrash(req, res, next) {
  try {
    const result = await emptyUserTrash(req.user.id)
    return res.json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  emptyTrash,
  listTrash,
  permanentDelete,
  restore,
}
