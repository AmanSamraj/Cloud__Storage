const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { createShare, deleteShare, listShares, updateShare } = require('../controllers/shareController')

const router = express.Router()

router.use(requireAuth)
router.post('/', createShare)
router.get('/:resourceType/:resourceId', listShares)
router.patch('/:id', updateShare)
router.delete('/:id', deleteShare)

module.exports = router
