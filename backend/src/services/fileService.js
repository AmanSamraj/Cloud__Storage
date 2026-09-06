const { getSupabaseAdmin } = require('../config/supabase')
const { getFolderPermission } = require('./folderService')

const FILE_FIELDS = 'id, owner_id, folder_id, name, storage_path, mime_type, size_bytes, is_deleted, created_at, updated_at'

async function getFile(fileId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('files')
    .select(FILE_FIELDS)
    .eq('id', fileId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function requireFileEditAccess(fileId, userId) {
  const { file, permission } = await getFileAccess(fileId, userId)

  if (permission === 'owner' || permission === 'editor') return file

  const permissionError = new Error('File edit permission required')
  permissionError.statusCode = 403
  throw permissionError
}

async function requireFileReadAccess(fileId, userId) {
  const { file, permission } = await getFileAccess(fileId, userId)

  if (['owner', 'viewer', 'editor'].includes(permission)) return file

  const permissionError = new Error('File access denied')
  permissionError.statusCode = 403
  throw permissionError
}

async function getFileAccess(fileId, userId) {
  const file = await getFile(fileId)

  if (!file || file.is_deleted) {
    const error = new Error('File not found')
    error.statusCode = 404
    throw error
  }

  if (file.owner_id === userId) return { file, permission: 'owner' }

  const supabase = getSupabaseAdmin()
  const { data: share, error } = await supabase
    .from('shares')
    .select('role')
    .eq('resource_type', 'file')
    .eq('resource_id', fileId)
    .eq('grantee_user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (share?.role) return { file, permission: share.role }

  if (file.folder_id) {
    const folderPermission = await getFolderPermission(await getFolderForFile(file.folder_id), userId)
    if (folderPermission) return { file, permission: folderPermission }
  }

  return { file, permission: null }
}

async function getFolderForFile(folderId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('folders').select('id, owner_id, parent_id').eq('id', folderId).maybeSingle()
  if (error) throw error
  return data
}

module.exports = { FILE_FIELDS, getFile, requireFileEditAccess, requireFileReadAccess }
