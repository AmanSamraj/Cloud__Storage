require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const authRoutes = require('./src/routes/authRoutes')
const fileRoutes = require('./src/routes/fileRoutes')
const folderRoutes = require('./src/routes/folderRoutes')
const shareRoutes = require('./src/routes/shareRoutes')
const linkShareRoutes = require('./src/routes/linkShareRoutes')
const publicLinkRoutes = require('./src/routes/publicLinkRoutes')
const searchRoutes = require('./src/routes/searchRoutes')
const trashRoutes = require('./src/routes/trashRoutes')
const starRoutes = require('./src/routes/starRoutes')
const recentRoutes = require('./src/routes/recentRoutes')

const app = express()
const PORT = process.env.PORT || 5001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/folders', folderRoutes)
app.use('/api/shares', shareRoutes)
app.use('/api/link-shares', linkShareRoutes)
app.use('/api/link', publicLinkRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/trash', trashRoutes)
app.use('/api/stars', starRoutes)
app.use('/api/recent', recentRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' })
})

app.use((error, _req, res, _next) => {
  console.error(error)

  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Maximum size is 10 MB'
      : 'Invalid multipart upload'
    return res.status(400).json({ error: message })
  }

  return res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' })
})

let server
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`)
  })

  server.on('error', (error) => {
    console.error('Backend server error:', error.message)
    process.exitCode = 1
  })

  server.on('close', () => {
    console.log('Backend server closed')
  })
}

module.exports = app
