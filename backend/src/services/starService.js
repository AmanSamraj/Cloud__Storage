const { getSupabaseAdmin } = require('../config/supabase')
const { getResource } = require('./shareService')

async function addStar({ userId, resourceType, resourceId }) {
  if (!['file', 'folder'].includes(resourceType)) {
    const error = new Error('resourceType must be "file" or "folder"')
    error.statusCode = 400
    throw error
  }

  const resource = await getResource(resourceType, resourceId)
  if (!resource) {
    const error = new Error(`${resourceType === 'file' ? 'File' : 'Folder'} not found`)
    error.statusCode = 404
    throw error
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('stars')
    .upsert(
      {
        user_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, resource_type, resource_id' },
    )
    .select('user_id, resource_type, resource_id, created_at')
    .single()

  if (error) throw error
  return { starred: true, star: data }
}

async function removeStar({ userId, resourceType, resourceId }) {
  if (!['file', 'folder'].includes(resourceType)) {
    const error = new Error('resourceType must be "file" or "folder"')
    error.statusCode = 400
    throw error
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('stars')
    .delete()
    .eq('user_id', userId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)

  if (error) throw error
  return { starred: false, resourceType, resourceId }
}

async function getUserStarredIds(userId) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('stars')
    .select('resource_type, resource_id')
    .eq('user_id', userId)

  if (error) throw error

  const starredFileIds = new Set()
  const starredFolderIds = new Set()

  for (const item of data || []) {
    if (item.resource_type === 'file') starredFileIds.add(item.resource_id)
    else if (item.resource_type === 'folder') starredFolderIds.add(item.resource_id)
  }

  return { starredFileIds, starredFolderIds }
}

async function getStarredItems(userId) {
  const supabase = getSupabaseAdmin()
  const { data: starRecords, error: starsError } = await supabase
    .from('stars')
    .select('resource_type, resource_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (starsError) throw starsError
  if (!starRecords || starRecords.length === 0) {
    return { items: [] }
  }

  const fileIds = starRecords.filter((s) => s.resource_type === 'file').map((s) => s.resource_id)
  const folderIds = starRecords.filter((s) => s.resource_type === 'folder').map((s) => s.resource_id)

  const promises = []

  if (fileIds.length > 0) {
    promises.push(
      supabase
        .from('files')
        .select('id, owner_id, folder_id, name, mime_type, size_bytes, is_deleted, created_at, updated_at')
        .in('id', fileIds)
        .eq('is_deleted', false),
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  if (folderIds.length > 0) {
    promises.push(
      supabase
        .from('folders')
        .select('id, owner_id, parent_id, name, is_deleted, created_at, updated_at')
        .in('id', folderIds)
        .eq('is_deleted', false),
    )
  } else {
    promises.push(Promise.resolve({ data: [] }))
  }

  const [filesResult, foldersResult] = await Promise.all(promises)
  if (filesResult.error) throw filesResult.error
  if (foldersResult.error) throw foldersResult.error

  const filesMap = new Map((filesResult.data || []).map((f) => [f.id, f]))
  const foldersMap = new Map((foldersResult.data || []).map((f) => [f.id, f]))

  // Fetch owner details
  const ownerIds = new Set()
  for (const f of filesResult.data || []) ownerIds.add(f.owner_id)
  for (const f of foldersResult.data || []) ownerIds.add(f.owner_id)

  let ownerMap = new Map()
  if (ownerIds.size > 0) {
    const { data: owners } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url')
      .in('id', Array.from(ownerIds))
    if (owners) ownerMap = new Map(owners.map((u) => [u.id, u]))
  }

  const items = []
  for (const record of starRecords) {
    if (record.resource_type === 'file') {
      const file = filesMap.get(record.resource_id)
      if (!file) continue // Skip deleted or missing files
      const owner = ownerMap.get(file.owner_id)
      items.push({
        id: file.id,
        name: file.name,
        resourceType: 'file',
        folderId: file.folder_id,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
        isStarred: true,
        starredAt: record.created_at,
        isOwner: file.owner_id === userId,
        owner: owner
          ? {
              id: owner.id,
              email: owner.email,
              displayName: owner.display_name || owner.email,
              avatarUrl: owner.avatar_url,
            }
          : null,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
      })
    } else if (record.resource_type === 'folder') {
      const folder = foldersMap.get(record.resource_id)
      if (!folder) continue // Skip deleted or missing folders
      const owner = ownerMap.get(folder.owner_id)
      items.push({
        id: folder.id,
        name: folder.name,
        resourceType: 'folder',
        parentId: folder.parent_id,
        mimeType: 'folder',
        sizeBytes: null,
        isStarred: true,
        starredAt: record.created_at,
        isOwner: folder.owner_id === userId,
        owner: owner
          ? {
              id: owner.id,
              email: owner.email,
              displayName: owner.display_name || owner.email,
              avatarUrl: owner.avatar_url,
            }
          : null,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at,
      })
    }
  }

  return { items }
}

module.exports = {
  addStar,
  getStarredItems,
  getUserStarredIds,
  removeStar,
}
