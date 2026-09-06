const { getSupabaseAdmin } = require('../config/supabase')
const { getUserStarredIds } = require('./starService')
const { getAccessibleFolders } = require('./folderService')

async function getRecentItems(userId, limit = 50) {
  const supabase = getSupabaseAdmin()

  // 1. Get user's starred IDs for fast tagging
  const { starredFileIds, starredFolderIds } = await getUserStarredIds(userId)

  // 2. Fetch accessible folders & shared files
  const [folders, sharedFilesRes] = await Promise.all([
    getAccessibleFolders(userId),
    supabase
      .from('shares')
      .select('resource_id, role')
      .eq('resource_type', 'file')
      .eq('grantee_user_id', userId),
  ])

  const sharedFileIds = (sharedFilesRes.data || []).map((s) => s.resource_id)

  // 3. Fetch recent files (owned or shared)
  let filesQuery = supabase
    .from('files')
    .select('id, owner_id, folder_id, name, mime_type, size_bytes, is_deleted, created_at, updated_at')
    .eq('is_deleted', false)

  if (sharedFileIds.length > 0) {
    filesQuery = filesQuery.or(`owner_id.eq.${userId},id.in.(${sharedFileIds.join(',')})`)
  } else {
    filesQuery = filesQuery.eq('owner_id', userId)
  }

  const { data: recentFiles, error: filesErr } = await filesQuery
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (filesErr) throw filesErr

  // 4. Transform folders
  const folderItems = (folders || []).slice(0, 20).map((folder) => ({
    id: folder.id,
    name: folder.name,
    resourceType: 'folder',
    parentId: folder.parent_id,
    mimeType: 'folder',
    sizeBytes: null,
    ownerId: folder.owner_id,
    isOwner: folder.owner_id === userId,
    isStarred: starredFolderIds.has(folder.id),
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
  }))

  // 5. Transform files
  const fileItems = (recentFiles || []).map((file) => ({
    id: file.id,
    name: file.name,
    resourceType: 'file',
    folderId: file.folder_id,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    ownerId: file.owner_id,
    isOwner: file.owner_id === userId,
    isStarred: starredFileIds.has(file.id),
    createdAt: file.created_at,
    updatedAt: file.updated_at,
  }))

  // 6. Combine and sort
  const combined = [...fileItems, ...folderItems].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  // 7. Enrich with owner info
  const ownerIds = Array.from(new Set(combined.map((i) => i.ownerId).filter(Boolean)))
  let ownerMap = new Map()
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url')
      .in('id', ownerIds)
    if (owners) ownerMap = new Map(owners.map((u) => [u.id, u]))
  }

  const items = combined.slice(0, limit).map((item) => {
    const owner = ownerMap.get(item.ownerId)
    return {
      ...item,
      owner: owner
        ? {
            id: owner.id,
            email: owner.email,
            displayName: owner.display_name || owner.email,
            avatarUrl: owner.avatar_url,
          }
        : null,
    }
  })

  // 8. Group by human-readable time periods
  const groups = groupItemsByPeriod(items)

  return { items, groups }
}

function groupItemsByPeriod(items) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
  const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000
  const startOfThisMonth = startOfToday - 30 * 24 * 60 * 60 * 1000

  const buckets = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  }

  for (const item of items) {
    const time = new Date(item.updatedAt).getTime()
    if (time >= startOfToday) {
      buckets.today.push(item)
    } else if (time >= startOfYesterday) {
      buckets.yesterday.push(item)
    } else if (time >= startOfThisWeek) {
      buckets.thisWeek.push(item)
    } else if (time >= startOfThisMonth) {
      buckets.thisMonth.push(item)
    } else {
      buckets.older.push(item)
    }
  }

  const result = []
  if (buckets.today.length) result.push({ title: 'Today', items: buckets.today })
  if (buckets.yesterday.length) result.push({ title: 'Yesterday', items: buckets.yesterday })
  if (buckets.thisWeek.length) result.push({ title: 'Earlier this week', items: buckets.thisWeek })
  if (buckets.thisMonth.length) result.push({ title: 'Earlier this month', items: buckets.thisMonth })
  if (buckets.older.length) result.push({ title: 'Older', items: buckets.older })

  return result
}

module.exports = {
  getRecentItems,
}
