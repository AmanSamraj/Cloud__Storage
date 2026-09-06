const express = require('express')
const { requireAuth } = require('../middleware/authMiddleware')
const {
  createFolder,
  deleteFolder,
  getFolderContents,
  getFolderTree,
  getRootContents,
  updateFolder,
} = require('../controllers/folderController')

const router = express.Router()

router.use(requireAuth)
router.post('/', createFolder)
router.get('/root', getRootContents)
router.get('/tree', getFolderTree)
router.get('/:id', getFolderContents)
router.patch('/:id', updateFolder)
router.delete('/:id', deleteFolder)

module.exports = router
