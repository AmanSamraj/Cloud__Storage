const { getSupabaseAdmin } = require('../config/supabase')

const FOLDER_FIELDS = 'id, owner_id, parent_id, name, created_at, updated_at'

async function getFolder(folderId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_FIELDS)
    .eq('id', folderId)
    .maybeSingle()

  if (error) throw error
  if (data?.is_deleted) return null
  return data
}

async function getPermission(folderId, userId) {
  const folder = await getFolder(folderId)
  if (!folder) return { folder: null, permission: null }

  const permission = await getFolderPermission(folder, userId)
  return { folder, permission }
}

async function getFolderPermission(folder, userId) {
  const supabase = getSupabaseAdmin()
  let current = folder
  let inheritedPermission = null
  let steps = 0

  while (current && steps < 100) {
    if (current.owner_id === userId) return 'owner'

    const { data: share, error } = await supabase
      .from('shares')
      .select('role')
      .eq('resource_type', 'folder')
      .eq('resource_id', current.id)
      .eq('grantee_user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (share?.role === 'editor') return 'editor'
    if (share?.role === 'viewer') inheritedPermission = 'viewer'

    current = current.parent_id ? await getFolder(current.parent_id) : null
    steps += 1
  }

  return inheritedPermission
}

async function requireFolderAccess(folderId, userId, edit = false) {
  const access = await getPermission(folderId, userId)

  if (!access.folder) {
    const error = new Error('Folder not found')
    error.statusCode = 404
    throw error
  }

  const allowed = edit
    ? ['owner', 'editor'].includes(access.permission)
    : ['owner', 'viewer', 'editor'].includes(access.permission)

  if (!allowed) {
    const error = new Error(edit ? 'Folder edit permission required' : 'Folder access denied')
    error.statusCode = 403
    throw error
  }

  return access.folder
}

async function getBreadcrumbs(folder, userId) {
  const breadcrumbs = [{ id: null, name: 'My Drive' }]
  const chain = []
  let current = folder

  while (current) {
    chain.unshift({ id: current.id, name: current.name })
    if (!current.parent_id) {
      current = null
      continue
    }

    const parentAccess = await getPermission(current.parent_id, userId)
    current = parentAccess.permission ? parentAccess.folder : null
  }

  return breadcrumbs.concat(chain)
}

async function getAccessibleFolders(userId) {
  const supabase = getSupabaseAdmin()
  const [foldersResult, sharedResult] = await Promise.all([
    supabase.from('folders').select(FOLDER_FIELDS).eq('is_deleted', false),
    supabase
      .from('shares')
      .select('resource_id, role')
      .eq('resource_type', 'folder')
      .eq('grantee_user_id', userId),
  ])

  if (foldersResult.error) throw foldersResult.error
  if (sharedResult.error) throw sharedResult.error

  const directRoles = new Map(sharedResult.data.map((share) => [share.resource_id, share.role]))
  const foldersById = new Map(foldersResult.data.map((folder) => [folder.id, folder]))
  const permissionCache = new Map()

  function permissionFor(folder, seen = new Set()) {
    if (!folder || seen.has(folder.id)) return null
    if (folder.owner_id === userId) return 'owner'
    if (directRoles.has(folder.id)) return directRoles.get(folder.id)
    seen.add(folder.id)
    return permissionFor(foldersById.get(folder.parent_id), seen)
  }

  return foldersResult.data.filter((folder) => {
    if (!permissionCache.has(folder.id)) permissionCache.set(folder.id, permissionFor(folder))
    return permissionCache.get(folder.id)
  })
}

async function isInsideFolder(folderId, possibleAncestorId) {
  let current = await getFolder(folderId)
  let steps = 0

  while (current && steps < 100) {
    if (current.id === possibleAncestorId) return true
    current = current.parent_id ? await getFolder(current.parent_id) : null
    steps += 1
  }

  return false
}

module.exports = {
  FOLDER_FIELDS,
  getBreadcrumbs,
  getAccessibleFolders,
  getFolder,
  getFolderPermission,
  isInsideFolder,
  requireFolderAccess,
}
