const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { getSupabaseAdmin } = require('../config/supabase')
const { requireFolderAccess } = require('../services/folderService')
const { FILE_FIELDS, requireFileEditAccess, requireFileReadAccess } = require('../services/fileService')

const STORAGE_BUCKET = 'drive'
const DOWNLOAD_URL_TTL_SECONDS = 60

async function uploadFile(req, res, next) {
  let storagePath

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A file is required' })
    }

    const folderId = req.body.folderId || null
    if (folderId) {
      await requireFolderAccess(folderId, req.user.id, true)
    }

    const safeName = sanitizeFilename(req.file.originalname)
    storagePath = `${req.user.id}/${folderId || 'root'}/${randomUUID()}-${safeName}`
    const supabase = getSupabaseAdmin()
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      })

    if (storageError) {
      const error = new Error(`Storage upload failed: ${storageError.message}`)
      error.statusCode = 502
      throw error
    }

    const { data: file, error: metadataError } = await supabase
      .from('files')
      .insert({
        owner_id: req.user.id,
        folder_id: folderId,
        name: safeName,
        storage_path: storagePath,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
      })
      .select(FILE_FIELDS)
      .single()

    if (metadataError) {
      const error = new Error(`File metadata could not be saved: ${metadataError.message}`)
      error.statusCode = metadataError.code === '23505' ? 409 : 500
      throw error
    }

    return res.status(201).json({ file })
  } catch (error) {
    if (storagePath) {
      await removeUploadedObject(storagePath)
    }
    next(error)
  }
}

async function updateFile(req, res, next) {
  try {
    const file = await requireFileEditAccess(req.params.id, req.user.id)
    const updates = {}

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
        return res.status(400).json({ error: 'A valid file name is required' })
      }
      const name = sanitizeFilename(req.body.name)
      if (name.length > 255) return res.status(400).json({ error: 'File name is too long' })
      updates.name = name
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'folderId')) {
      const folderId = req.body.folderId || null
      if (folderId) await requireFolderAccess(folderId, req.user.id, true)
      updates.folder_id = folderId
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No file changes provided' })
    }

    const duplicate = await hasDuplicateName(file, updates)
    if (duplicate) return res.status(409).json({ error: 'A file with this name already exists in that folder' })

    updates.updated_at = new Date().toISOString()
    const supabase = getSupabaseAdmin()
    const { data: updatedFile, error } = await supabase
      .from('files')
      .update(updates)
      .eq('id', file.id)
      .select(FILE_FIELDS)
      .single()

    if (error) throw error
    return res.json({ file: updatedFile })
  } catch (error) {
    next(error)
  }
}

async function deleteFile(req, res, next) {
  try {
    const file = await requireFileEditAccess(req.params.id, req.user.id)
    const supabase = getSupabaseAdmin()
    const { data: deletedFile, error } = await supabase
      .from('files')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', file.id)
      .select(FILE_FIELDS)
      .single()

    if (error) throw error
    return res.json({ file: deletedFile, message: 'File moved to trash' })
  } catch (error) {
    next(error)
  }
}

async function downloadFile(req, res, next) {
  try {
    const file = await requireFileReadAccess(req.params.id, req.user.id)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(file.storage_path, DOWNLOAD_URL_TTL_SECONDS, { download: file.name })

    if (error) {
      const storageError = new Error(`Could not create download URL: ${error.message}`)
      storageError.statusCode = 502
      throw storageError
    }

    return res.json({ url: data.signedUrl, expiresIn: DOWNLOAD_URL_TTL_SECONDS })
  } catch (error) {
    next(error)
  }
}

async function hasDuplicateName(file, updates) {
  const name = updates.name || file.name
  const folderId = Object.prototype.hasOwnProperty.call(updates, 'folder_id')
    ? updates.folder_id
    : file.folder_id
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('files')
    .select('id')
    .eq('owner_id', file.owner_id)
    .eq('is_deleted', false)
    .ilike('name', name)
    .neq('id', file.id)

  query = folderId ? query.eq('folder_id', folderId) : query.is('folder_id', null)
  const { data, error } = await query.limit(1)
  if (error) throw error
  return data.length > 0
}

function sanitizeFilename(filename) {
  const normalized = String(filename || 'file').normalize('NFKC')
  const extension = path.extname(normalized).slice(0, 20)
  const baseName = path.basename(normalized, path.extname(normalized))
  const safeBaseName = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  return `${safeBaseName || 'file'}${extension}`
}

async function removeUploadedObject(storagePath) {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
  } catch (rollbackError) {
    console.error('Could not roll back uploaded object:', rollbackError.message)
  }
}

module.exports = { deleteFile, downloadFile, sanitizeFilename, updateFile, uploadFile }
