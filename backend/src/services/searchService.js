const { getSupabaseAdmin } = require('../config/supabase')

const MIME_TYPE_CATEGORIES = {
  image: ['image/'],
  video: ['video/'],
  audio: ['audio/'],
  pdf: ['application/pdf'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/rtf',
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  code: [
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'application/xml',
    'text/xml',
    'text/x-',
    'application/javascript',
    'application/typescript',
  ],
  archive: [
    'application/zip',
    'application/x-tar',
    'application/gzip',
    'application/x-bzip2',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
  ],
}

async function searchResources({
  userId,
  q = '',
  type = 'all',
  owner = 'all',
  starred = null,
  sortBy = 'updated_at',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
}) {
  const supabase = getSupabaseAdmin()
  const cleanQ = typeof q === 'string' ? q.trim() : ''
  const parsedPage = Math.max(1, parseInt(page, 10) || 1)
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
  const isStarredFilter = starred === true || starred === 'true' || starred === '1'

  // 1. Fetch user's starred resource IDs
  const { getUserStarredIds } = require('./starService')
  const { starredFileIds, starredFolderIds } = await getUserStarredIds(userId)

  // 2. Fetch accessible shared resource IDs
  const { data: sharedEntries, error: shareError } = await supabase
    .from('shares')
    .select('resource_type, resource_id, role')
    .eq('grantee_user_id', userId)

  if (shareError) throw shareError

  const sharedFileIds = new Set()
  const sharedFolderIds = new Set()
  const shareRoleMap = new Map()

  for (const entry of sharedEntries || []) {
    const key = `${entry.resource_type}:${entry.resource_id}`
    shareRoleMap.set(key, entry.role)
    if (entry.resource_type === 'file') {
      sharedFileIds.add(entry.resource_id)
    } else if (entry.resource_type === 'folder') {
      sharedFolderIds.add(entry.resource_id)
    }
  }

  const shouldFetchFolders = type === 'all' || type === 'folder'
  const shouldFetchFiles = type !== 'folder'

  const promises = []

  // 3. Query Folders (if applicable)
  if (shouldFetchFolders) {
    promises.push(
      (async () => {
        let folderQuery = supabase
          .from('folders')
          .select('id, owner_id, parent_id, name, created_at, updated_at')

        // Case-insensitive substring match on name
        if (cleanQ) {
          folderQuery = folderQuery.ilike('name', `%${cleanQ}%`)
        }

        // Owner filter for folders
        if (owner === 'me') {
          folderQuery = folderQuery.eq('owner_id', userId)
        } else if (owner === 'others' || owner === 'shared') {
          if (sharedFolderIds.size === 0) return []
          folderQuery = folderQuery.in('id', Array.from(sharedFolderIds))
        }

        const { data: folders, error: folderErr } = await folderQuery
        if (folderErr) throw folderErr

        // Filter for access permission and starred
        return (folders || [])
          .filter((folder) => {
            const isOwned = folder.owner_id === userId
            const isShared = sharedFolderIds.has(folder.id)
            if (!isOwned && !isShared && owner !== 'others') return false
            if (isStarredFilter && !starredFolderIds.has(folder.id)) return false
            return true
          })
          .map((folder) => ({
            id: folder.id,
            name: folder.name,
            resourceType: 'folder',
            parentId: folder.parent_id,
            mimeType: 'folder',
            sizeBytes: null,
            isStarred: starredFolderIds.has(folder.id),
            ownerId: folder.owner_id,
            isOwner: folder.owner_id === userId,
            permission: folder.owner_id === userId ? 'owner' : shareRoleMap.get(`folder:${folder.id}`) || 'viewer',
            createdAt: folder.created_at,
            updatedAt: folder.updated_at,
          }))
      })(),
    )
  } else {
    promises.push(Promise.resolve([]))
  }

  // 4. Query Files (if applicable)
  if (shouldFetchFiles) {
    promises.push(
      (async () => {
        let fileQuery = supabase
          .from('files')
          .select('id, owner_id, folder_id, name, mime_type, size_bytes, is_deleted, created_at, updated_at')
          .eq('is_deleted', false)

        // Case-insensitive substring match on name
        if (cleanQ) {
          fileQuery = fileQuery.ilike('name', `%${cleanQ}%`)
        }

        // MIME / Type Filter
        if (type && type !== 'all' && type !== 'file') {
          const categories = MIME_TYPE_CATEGORIES[type.toLowerCase()]
          if (categories) {
            // Check matching MIME type prefix or extension
            const orConditions = categories.map((cat) => `mime_type.ilike.${cat}%`).join(',')
            fileQuery = fileQuery.or(orConditions)
          } else if (type.includes('/')) {
            fileQuery = fileQuery.ilike('mime_type', type)
          } else {
            fileQuery = fileQuery.ilike('name', `%.${type}`)
          }
        }

        // Owner filter for files
        if (owner === 'me') {
          fileQuery = fileQuery.eq('owner_id', userId)
        } else if (owner === 'others' || owner === 'shared') {
          if (sharedFileIds.size === 0) return []
          fileQuery = fileQuery.in('id', Array.from(sharedFileIds))
        }

        const { data: files, error: fileErr } = await fileQuery
        if (fileErr) throw fileErr

        return (files || [])
          .filter((file) => {
            const isOwned = file.owner_id === userId
            const isShared = sharedFileIds.has(file.id)
            if (!isOwned && !isShared && owner !== 'others') return false
            if (isStarredFilter && !starredFileIds.has(file.id)) return false
            return true
          })
          .map((file) => ({
            id: file.id,
            name: file.name,
            resourceType: 'file',
            folderId: file.folder_id,
            mimeType: file.mime_type,
            sizeBytes: file.size_bytes,
            isStarred: starredFileIds.has(file.id),
            ownerId: file.owner_id,
            isOwner: file.owner_id === userId,
            permission: file.owner_id === userId ? 'owner' : shareRoleMap.get(`file:${file.id}`) || 'viewer',
            createdAt: file.created_at,
            updatedAt: file.updated_at,
          }))
      })(),
    )
  } else {
    promises.push(Promise.resolve([]))
  }

  const [folderResults, fileResults] = await Promise.all(promises)
  let combined = [...folderResults, ...fileResults]

  // 5. Enrich with owner details (display_name, email)
  const ownerIds = Array.from(new Set(combined.map((item) => item.ownerId).filter(Boolean)))
  if (ownerIds.length > 0) {
    const { data: owners, error: ownersErr } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url')
      .in('id', ownerIds)

    if (!ownersErr && owners) {
      const ownerMap = new Map(owners.map((u) => [u.id, u]))
      combined = combined.map((item) => {
        const ownerInfo = ownerMap.get(item.ownerId)
        return {
          ...item,
          owner: ownerInfo
            ? {
                id: ownerInfo.id,
                email: ownerInfo.email,
                displayName: ownerInfo.display_name || ownerInfo.email,
                avatarUrl: ownerInfo.avatar_url,
              }
            : null,
        }
      })
    }
  }

  // 6. Filter by specific owner string (email or display name) if provided
  if (owner && !['all', 'me', 'others', 'shared'].includes(owner)) {
    const ownerLower = owner.toLowerCase()
    combined = combined.filter((item) => {
      const emailMatch = item.owner?.email?.toLowerCase().includes(ownerLower)
      const nameMatch = item.owner?.displayName?.toLowerCase().includes(ownerLower)
      const idMatch = item.ownerId === owner
      return emailMatch || nameMatch || idMatch
    })
  }

  // 7. Sorting
  const orderMultiplier = sortOrder.toLowerCase() === 'asc' ? 1 : -1
  combined.sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name) * orderMultiplier
    }
    if (sortBy === 'size_bytes' || sortBy === 'size') {
      const sizeA = a.sizeBytes || 0
      const sizeB = b.sizeBytes || 0
      return (sizeA - sizeB) * orderMultiplier
    }
    if (sortBy === 'created_at') {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return (dateA - dateB) * orderMultiplier
    }
    // Default: updated_at
    const dateA = new Date(a.updatedAt).getTime()
    const dateB = new Date(b.updatedAt).getTime()
    return (dateA - dateB) * orderMultiplier
  })

  // 8. Pagination
  const total = combined.length
  const totalPages = Math.ceil(total / parsedLimit) || 1
  const offset = (parsedPage - 1) * parsedLimit
  const paginatedResults = combined.slice(offset, offset + parsedLimit)

  return {
    results: paginatedResults,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
      hasMore: parsedPage < totalPages,
    },
    query: {
      q: cleanQ,
      type,
      owner,
      starred: isStarredFilter,
      sortBy,
      sortOrder,
    },
  }
}

async function toggleStarResource({ userId, resourceType, resourceId, star }) {
  const supabase = getSupabaseAdmin()
  const table = resourceType === 'folder' ? 'starred_folders' : 'starred_files'
  const idCol = resourceType === 'folder' ? 'folder_id' : 'file_id'

  if (star) {
    const { error } = await supabase
      .from(table)
      .upsert({ user_id: userId, [idCol]: resourceId }, { onConflict: `user_id, ${idCol}` })
    if (error) throw error
    return { starred: true }
  } else {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq(idCol, resourceId)
    if (error) throw error
    return { starred: false }
  }
}

module.exports = {
  searchResources,
  toggleStarResource,
  MIME_TYPE_CATEGORIES,
}
