const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { listRecent } = require('../controllers/recentController')

const router = express.Router()

router.use(requireAuth)

router.get('/', listRecent)

module.exports = router
