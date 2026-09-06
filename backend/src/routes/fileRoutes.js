const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const { upload } = require('../middleware/uploadMiddleware')
const { deleteFile, downloadFile, updateFile, uploadFile } = require('../controllers/fileController')

const router = express.Router()

router.post('/upload', requireAuth, upload.single('file'), uploadFile)
router.get('/:id', requireAuth, downloadFile)
router.patch('/:id', requireAuth, updateFile)
router.delete('/:id', requireAuth, deleteFile)

module.exports = router
