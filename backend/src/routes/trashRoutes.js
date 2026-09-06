const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const {
  emptyTrash,
  listTrash,
  permanentDelete,
  restore,
} = require('../controllers/trashController')

const router = express.Router()

router.use(requireAuth)

router.get('/', listTrash)
router.post('/restore', restore)
router.delete('/empty', emptyTrash)
router.delete('/:resourceType/:id', permanentDelete)

module.exports = router
