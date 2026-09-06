const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { listStarred, starResource, unstarResource } = require('../controllers/starController')

const router = express.Router()

router.use(requireAuth)

router.get('/', listStarred)
router.post('/', starResource)
router.delete('/', unstarResource)
router.delete('/:resourceType/:resourceId', unstarResource)

module.exports = router
