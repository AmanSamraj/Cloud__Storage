const { getSupabaseAdmin } = require('../config/supabase')

const STORAGE_BUCKET = 'drive'

async function getTrashItems(userId) {
  const supabase = getSupabaseAdmin()

  const [filesRes, foldersRes] = await Promise.all([
    supabase
      .from('files')
      .select('id, owner_id, folder_id, name, mime_type, size_bytes, is_deleted, deleted_at, created_at, updated_at')
      .eq('owner_id', userId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('folders')
      .select('id, owner_id, parent_id, name, is_deleted, deleted_at, created_at, updated_at')
      .eq('owner_id', userId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false, nullsFirst: false }),
  ])

  if (filesRes.error) throw filesRes.error
  if (foldersRes.error) throw foldersRes.error

  const fileItems = (filesRes.data || []).map((file) => ({
    id: file.id,
    name: file.name,
    resourceType: 'file',
    folderId: file.folder_id,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    deletedAt: file.deleted_at || file.updated_at,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
  }))

  const folderItems = (foldersRes.data || []).map((folder) => ({
    id: folder.id,
    name: folder.name,
    resourceType: 'folder',
    parentId: folder.parent_id,
    mimeType: 'folder',
    sizeBytes: null,
    deletedAt: folder.deleted_at || folder.updated_at,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
  }))

  const items = [...folderItems, ...fileItems].sort((a, b) => {
    const timeA = new Date(a.deletedAt || 0).getTime()
    const timeB = new Date(b.deletedAt || 0).getTime()
    return timeB - timeA
  })

  return { items }
}

async function restoreTrashItem({ userId, resourceType, resourceId }) {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  if (resourceType === 'file') {
    const { data: file, error: findError } = await supabase
      .from('files')
      .select('id, owner_id, folder_id, name, is_deleted')
      .eq('id', resourceId)
      .eq('owner_id', userId)
      .maybeSingle()

    if (findError) throw findError
    if (!file) {
      const notFound = new Error('Trashed file not found')
      notFound.statusCode = 404
      throw notFound
    }

    // Check if the file's parent folder is currently deleted or missing
    let targetFolderId = file.folder_id
    if (targetFolderId) {
      const { data: parentFolder } = await supabase
        .from('folders')
        .select('id, is_deleted')
        .eq('id', targetFolderId)
        .maybeSingle()

      if (!parentFolder || parentFolder.is_deleted) {
        // If parent folder is deleted or gone, restore to root
        targetFolderId = null
      }
    }

    const { data: restoredFile, error: updateError } = await supabase
      .from('files')
      .update({
        is_deleted: false,
        deleted_at: null,
        folder_id: targetFolderId,
        updated_at: now,
      })
      .eq('id', file.id)
      .select('id, name, folder_id, mime_type, size_bytes, is_deleted, created_at, updated_at')
      .single()

    if (updateError) throw updateError
    return {
      message: 'File restored successfully',
      item: { ...restoredFile, resourceType: 'file' },
    }
  }

  if (resourceType === 'folder') {
    const { data: folder, error: findError } = await supabase
      .from('folders')
      .select('id, owner_id, parent_id, name, is_deleted')
      .eq('id', resourceId)
      .eq('owner_id', userId)
      .maybeSingle()

    if (findError) throw findError
    if (!folder) {
      const notFound = new Error('Trashed folder not found')
      notFound.statusCode = 404
      throw notFound
    }

    // Check if parent folder is deleted or missing
    let targetParentId = folder.parent_id
    if (targetParentId) {
      const { data: parentFolder } = await supabase
        .from('folders')
        .select('id, is_deleted')
        .eq('id', targetParentId)
        .maybeSingle()

      if (!parentFolder || parentFolder.is_deleted) {
        targetParentId = null
      }
    }

    // 1. Restore folder itself
    const { data: restoredFolder, error: updateError } = await supabase
      .from('folders')
      .update({
        is_deleted: false,
        deleted_at: null,
        parent_id: targetParentId,
        updated_at: now,
      })
      .eq('id', folder.id)
      .select('id, name, parent_id, is_deleted, created_at, updated_at')
      .single()

    if (updateError) throw updateError

    // 2. Recursively restore descendant folders and files
    await restoreFolderDescendants(folder.id, now)

    return {
      message: 'Folder and contents restored successfully',
      item: { ...restoredFolder, resourceType: 'folder' },
    }
  }

  const badType = new Error('Invalid resourceType. Must be "file" or "folder"')
  badType.statusCode = 400
  throw badType
}

async function restoreFolderDescendants(folderId, timestamp) {
  const supabase = getSupabaseAdmin()

  // Restore direct files in this folder
  await supabase
    .from('files')
    .update({ is_deleted: false, deleted_at: null, updated_at: timestamp })
    .eq('folder_id', folderId)

  // Find direct child folders
  const { data: childFolders } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_id', folderId)

  if (childFolders && childFolders.length > 0) {
    for (const child of childFolders) {
      await supabase
        .from('folders')
        .update({ is_deleted: false, deleted_at: null, updated_at: timestamp })
        .eq('id', child.id)
      await restoreFolderDescendants(child.id, timestamp)
    }
  }
}

async function softDeleteFolderHierarchy(folderId, timestamp) {
  const supabase = getSupabaseAdmin()

  // 1. Mark folder as deleted
  await supabase
    .from('folders')
    .update({ is_deleted: true, deleted_at: timestamp, updated_at: timestamp })
    .eq('id', folderId)

  // 2. Mark all files in folder as deleted
  await supabase
    .from('files')
    .update({ is_deleted: true, deleted_at: timestamp, updated_at: timestamp })
    .eq('folder_id', folderId)

  // 3. Recursively mark child folders
  const { data: childFolders } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_id', folderId)

  if (childFolders && childFolders.length > 0) {
    for (const child of childFolders) {
      await softDeleteFolderHierarchy(child.id, timestamp)
    }
  }
}

async function permanentDeleteResource({ userId, resourceType, resourceId }) {
  const supabase = getSupabaseAdmin()

  if (resourceType === 'file') {
    const { data: file, error: findError } = await supabase
      .from('files')
      .select('id, storage_path')
      .eq('id', resourceId)
      .eq('owner_id', userId)
      .maybeSingle()

    if (findError) throw findError
    if (!file) {
      const err = new Error('File not found')
      err.statusCode = 404
      throw err
    }

    // Delete from storage
    if (file.storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path])
    }

    // Delete from database
    const { error: delError } = await supabase.from('files').delete().eq('id', file.id)
    if (delError) throw delError

    return { message: 'File permanently deleted' }
  }

  if (resourceType === 'folder') {
    const { data: folder, error: findError } = await supabase
      .from('folders')
      .select('id')
      .eq('id', resourceId)
      .eq('owner_id', userId)
      .maybeSingle()

    if (findError) throw findError
    if (!folder) {
      const err = new Error('Folder not found')
      err.statusCode = 404
      throw err
    }

    // Collect and remove all descendant files and storage objects
    await permanentDeleteFolderHierarchy(folder.id)

    // Delete folder row
    const { error: delError } = await supabase.from('folders').delete().eq('id', folder.id)
    if (delError) throw delError

    return { message: 'Folder permanently deleted' }
  }

  const badType = new Error('Invalid resourceType')
  badType.statusCode = 400
  throw badType
}

async function permanentDeleteFolderHierarchy(folderId) {
  const supabase = getSupabaseAdmin()

  // Find and remove all files in this folder
  const { data: files } = await supabase
    .from('files')
    .select('id, storage_path')
    .eq('folder_id', folderId)

  if (files && files.length > 0) {
    const paths = files.map((f) => f.storage_path).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(paths)
    }
    await supabase.from('files').delete().eq('folder_id', folderId)
  }

  // Find and recursively delete child folders
  const { data: childFolders } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_id', folderId)

  if (childFolders && childFolders.length > 0) {
    for (const child of childFolders) {
      await permanentDeleteFolderHierarchy(child.id)
      await supabase.from('folders').delete().eq('id', child.id)
    }
  }
}

async function emptyUserTrash(userId) {
  const supabase = getSupabaseAdmin()

  // 1. Delete all trashed files
  const { data: trashedFiles } = await supabase
    .from('files')
    .select('id, storage_path')
    .eq('owner_id', userId)
    .eq('is_deleted', true)

  if (trashedFiles && trashedFiles.length > 0) {
    const paths = trashedFiles.map((f) => f.storage_path).filter(Boolean)
    if (paths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(paths)
    }
    const fileIds = trashedFiles.map((f) => f.id)
    await supabase.from('files').delete().in('id', fileIds)
  }

  // 2. Delete all trashed folders
  const { data: trashedFolders } = await supabase
    .from('folders')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_deleted', true)

  if (trashedFolders && trashedFolders.length > 0) {
    const folderIds = trashedFolders.map((f) => f.id)
    await supabase.from('folders').delete().in('id', folderIds)
  }

  return { message: 'Trash emptied permanently' }
}

module.exports = {
  emptyUserTrash,
  getTrashItems,
  permanentDeleteResource,
  restoreTrashItem,
  softDeleteFolderHierarchy,
}
