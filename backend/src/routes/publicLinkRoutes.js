const express = require('express')
const { getPublicLink } = require('../controllers/linkShareController')

const router = express.Router()

router.get('/:token', getPublicLink)

module.exports = router
