const { getSupabaseAdmin } = require('../config/supabase')
const {
  FOLDER_FIELDS,
  getAccessibleFolders,
  getBreadcrumbs,
  isInsideFolder,
  requireFolderAccess,
} = require('../services/folderService')
const { softDeleteFolderHierarchy } = require('../services/trashService')

async function createFolder(req, res, next) {
  try {
    const name = normalizeName(req.body.name)
    const parentId = req.body.parentId || null

    if (!name) return res.status(400).json({ error: 'Folder name is required' })
    if (name.length > 255) return res.status(400).json({ error: 'Folder name is too long' })

    if (parentId) {
      await requireFolderAccess(parentId, req.user.id, true)
    }

    const supabase = getSupabaseAdmin()
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({ owner_id: req.user.id, parent_id: parentId, name })
      .select(FOLDER_FIELDS)
      .single()

    if (error) return handleDatabaseError(error, res)
    return res.status(201).json({ folder })
  } catch (error) {
    next(error)
  }
}

async function getFolderContents(req, res, next) {
  try {
    const folder = await requireFolderAccess(req.params.id, req.user.id)
    const supabase = getSupabaseAdmin()
    const [foldersResult, filesResult, breadcrumbs] = await Promise.all([
      supabase
        .from('folders')
        .select(FOLDER_FIELDS)
        .eq('parent_id', folder.id)
        .eq('is_deleted', false)
        .order('name'),
      supabase
        .from('files')
        .select('id, owner_id, folder_id, name, mime_type, size_bytes, is_deleted, created_at, updated_at')
        .eq('folder_id', folder.id)
        .eq('is_deleted', false)
        .order('name'),
      getBreadcrumbs(folder, req.user.id),
    ])

    if (foldersResult.error) throw foldersResult.error
    if (filesResult.error) throw filesResult.error

    return res.json({
      folder,
      children: {
        folders: foldersResult.data,
        files: filesResult.data,
      },
      path: breadcrumbs,
    })
  } catch (error) {
    next(error)
  }
}

async function getRootContents(req, res, next) {
  try {
    const folders = await getAccessibleFolders(req.user.id)
    const supabase = getSupabaseAdmin()
    const rootFolders = folders.filter((folder) => folder.parent_id === null)
    const { data: files, error } = await supabase
      .from('files')
      .select('id, owner_id, folder_id, name, mime_type, size_bytes, is_deleted, created_at, updated_at')
      .eq('owner_id', req.user.id)
      .is('folder_id', null)
      .eq('is_deleted', false)
      .order('name')

    if (error) throw error

    return res.json({
      folder: null,
      children: { folders: rootFolders, files },
      path: [{ id: null, name: 'My Drive' }],
    })
  } catch (error) {
    next(error)
  }
}

async function getFolderTree(req, res, next) {
  try {
    const folders = await getAccessibleFolders(req.user.id)
    return res.json({ folders })
  } catch (error) {
    next(error)
  }
}

async function updateFolder(req, res, next) {
  try {
    const folder = await requireFolderAccess(req.params.id, req.user.id, true)
    const updates = {}

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = normalizeName(req.body.name)
      if (!name || name.length > 255) return res.status(400).json({ error: 'Invalid folder name' })
      updates.name = name
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'parentId')) {
      const parentId = req.body.parentId || null
      if (parentId === folder.id) return res.status(400).json({ error: 'A folder cannot contain itself' })
      if (parentId) {
        await requireFolderAccess(parentId, req.user.id, true)
        if (await isInsideFolder(parentId, folder.id)) {
          return res.status(400).json({ error: 'A folder cannot be moved inside its descendant' })
        }
      }
      updates.parent_id = parentId
    }

    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No folder changes provided' })
    updates.updated_at = new Date().toISOString()

    const supabase = getSupabaseAdmin()
    const { data: updatedFolder, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', folder.id)
      .select(FOLDER_FIELDS)
      .single()

    if (error) return handleDatabaseError(error, res)
    return res.json({ folder: updatedFolder })
  } catch (error) {
    next(error)
  }
}

async function deleteFolder(req, res, next) {
  try {
    const folder = await requireFolderAccess(req.params.id, req.user.id, true)
    const now = new Date().toISOString()
    await softDeleteFolderHierarchy(folder.id, now)
    return res.json({ message: 'Folder moved to trash' })
  } catch (error) {
    next(error)
  }
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function handleDatabaseError(error, res) {
  if (error.code === '23505') return res.status(409).json({ error: 'A folder with this name already exists here' })
  throw error
}

module.exports = {
  createFolder,
  deleteFolder,
  getFolderContents,
  getFolderTree,
  getRootContents,
  updateFolder,
}
