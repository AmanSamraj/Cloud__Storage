const assert = require('node:assert')

// Mock database simulation for Trash and Restore flow
let mockDb = {
  files: [
    { id: 'f1', name: 'Document1.pdf', owner_id: 'u1', folder_id: 'fold1', is_deleted: false, deleted_at: null },
    { id: 'f2', name: 'Photo.jpg', owner_id: 'u1', folder_id: null, is_deleted: true, deleted_at: '2026-08-01T00:00:00Z' }, // > 30 days old
    { id: 'f3', name: 'RecentDeleted.docx', owner_id: 'u1', folder_id: null, is_deleted: true, deleted_at: new Date().toISOString() },
  ],
  folders: [
    { id: 'fold1', name: 'Projects', owner_id: 'u1', parent_id: null, is_deleted: false, deleted_at: null },
  ]
}

// 1. Test Delete Flow (Soft Delete)
function softDeleteFile(fileId, userId) {
  const file = mockDb.files.find(f => f.id === fileId && f.owner_id === userId)
  assert(file, 'File must exist')
  file.is_deleted = true
  file.deleted_at = new Date().toISOString()
  return file
}

softDeleteFile('f1', 'u1')
assert.strictEqual(mockDb.files.find(f => f.id === 'f1').is_deleted, true, 'f1 should have is_deleted = true')
assert(mockDb.files.find(f => f.id === 'f1').deleted_at !== null, 'f1 should have deleted_at timestamp')
console.log('✓ Soft delete test passed')

// 2. Test Restore Flow
function restoreFile(fileId, userId) {
  const file = mockDb.files.find(f => f.id === fileId && f.owner_id === userId && f.is_deleted)
  assert(file, 'Trashed file must exist')
  file.is_deleted = false
  file.deleted_at = null
  return file
}

restoreFile('f1', 'u1')
assert.strictEqual(mockDb.files.find(f => f.id === 'f1').is_deleted, false, 'f1 should have is_deleted = false after restore')
assert.strictEqual(mockDb.files.find(f => f.id === 'f1').deleted_at, null, 'f1 should have deleted_at = null after restore')
console.log('✓ Restore test passed')

// 3. Test Scheduled Purge Simulation (> 30 days retention policy)
function purgeOldTrashItems(retentionDays = 30) {
  const thresholdTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)
  const toPurge = mockDb.files.filter(f => f.is_deleted && f.deleted_at && new Date(f.deleted_at).getTime() < thresholdTime)
  
  assert.strictEqual(toPurge.length, 1, 'Only f2 should be older than 30 days')
  assert.strictEqual(toPurge[0].id, 'f2', 'f2 is the old file to be purged')
  
  // Remove from mock db
  mockDb.files = mockDb.files.filter(f => !toPurge.some(p => p.id === f.id))
  return toPurge
}

const purged = purgeOldTrashItems(30)
assert.strictEqual(purged.length, 1)
assert.strictEqual(mockDb.files.some(f => f.id === 'f2'), false, 'f2 should no longer exist after purge')
console.log('✓ 30-day scheduled purge simulation passed')

console.log('All Trash and Restore verification tests passed successfully!')
