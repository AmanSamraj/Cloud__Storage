const assert = require('node:assert')

// Mock DB for stars and recent tests
let mockStarsDb = []
let mockFilesDb = [
  { id: 'f1', name: 'Roadmap.pdf', owner_id: 'user_A', mime_type: 'application/pdf', size_bytes: 12000, is_deleted: false, updated_at: '2026-09-06T02:00:00Z' },
  { id: 'f2', name: 'Budget.xlsx', owner_id: 'user_A', mime_type: 'application/vnd.ms-excel', size_bytes: 34000, is_deleted: false, updated_at: '2026-09-05T12:00:00Z' },
  { id: 'f3', name: 'Secret.docx', owner_id: 'user_B', mime_type: 'application/msword', size_bytes: 5000, is_deleted: false, updated_at: '2026-09-04T10:00:00Z' }
]

// 1. Test Star and Unstar APIs
function addStar(userId, resourceType, resourceId) {
  const existing = mockStarsDb.find(s => s.user_id === userId && s.resource_type === resourceType && s.resource_id === resourceId)
  if (!existing) {
    mockStarsDb.push({ user_id: userId, resource_type: resourceType, resource_id: resourceId, created_at: new Date().toISOString() })
  }
  return { starred: true }
}

function removeStar(userId, resourceType, resourceId) {
  mockStarsDb = mockStarsDb.filter(s => !(s.user_id === userId && s.resource_type === resourceType && s.resource_id === resourceId))
  return { starred: false }
}

// User A stars f1
addStar('user_A', 'file', 'f1')
assert.strictEqual(mockStarsDb.length, 1)
assert.strictEqual(mockStarsDb[0].resource_id, 'f1')

// User B stars f3
addStar('user_B', 'file', 'f3')
assert.strictEqual(mockStarsDb.length, 2)

// 2. Test User Isolation: User A should only see f1, User B only sees f3
function getStarredForUser(userId) {
  const userStars = mockStarsDb.filter(s => s.user_id === userId)
  const fileIds = userStars.filter(s => s.resource_type === 'file').map(s => s.resource_id)
  return mockFilesDb.filter(f => fileIds.includes(f.id) && !f.is_deleted)
}

const userAStarred = getStarredForUser('user_A')
assert.strictEqual(userAStarred.length, 1)
assert.strictEqual(userAStarred[0].id, 'f1')

const userBStarred = getStarredForUser('user_B')
assert.strictEqual(userBStarred.length, 1)
assert.strictEqual(userBStarred[0].id, 'f3')
console.log('✓ Star creation and user isolation tests passed')

// 3. Test Unstar
removeStar('user_A', 'file', 'f1')
const userAAfterUnstar = getStarredForUser('user_A')
assert.strictEqual(userAAfterUnstar.length, 0)
console.log('✓ Unstar test passed')

// 4. Test Recent items ordering
function getRecentForUser(userId) {
  return mockFilesDb
    .filter(f => f.owner_id === userId && !f.is_deleted)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

const userARecent = getRecentForUser('user_A')
assert.strictEqual(userARecent.length, 2)
assert.strictEqual(userARecent[0].id, 'f1', 'f1 should be first as it has later updated_at')
assert.strictEqual(userARecent[1].id, 'f2')
console.log('✓ Recent ordering test passed')

console.log('All Starred and Recent unit tests passed successfully!')
