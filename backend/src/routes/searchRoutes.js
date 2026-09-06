const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { search, star } = require('../controllers/searchController')

const router = express.Router()

router.get('/', requireAuth, search)
router.post('/star', requireAuth, star)

module.exports = router
