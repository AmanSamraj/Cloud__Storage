const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { createPublicLink, deletePublicLink } = require('../controllers/linkShareController')

const router = express.Router()

router.post('/', requireAuth, createPublicLink)
router.delete('/:id', requireAuth, deletePublicLink)

module.exports = router
