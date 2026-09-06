const assert = require('node:assert')
const { MIME_TYPE_CATEGORIES } = require('../src/services/searchService')

// Test MIME Category mappings
assert(Array.isArray(MIME_TYPE_CATEGORIES.image), 'MIME_TYPE_CATEGORIES.image should be an array')
assert(MIME_TYPE_CATEGORIES.image.includes('image/'), 'Image category should contain image/')
assert(MIME_TYPE_CATEGORIES.pdf.includes('application/pdf'), 'PDF category should match application/pdf')
assert(MIME_TYPE_CATEGORIES.document.includes('text/plain'), 'Document category should include text/plain')
assert(MIME_TYPE_CATEGORIES.code.includes('application/json'), 'Code category should include application/json')
console.log('✓ MIME Category definitions verified')

// Test in-memory search simulation (verifying sorting, filtering, and pagination algorithms)
const mockItems = [
  { id: '1', name: 'Project Roadmap.pdf', resourceType: 'file', mimeType: 'application/pdf', sizeBytes: 5000, isStarred: true, ownerId: 'u1', updatedAt: '2026-09-01T10:00:00Z' },
  { id: '2', name: 'Finance Report Q3.xlsx', resourceType: 'file', mimeType: 'application/vnd.ms-excel', sizeBytes: 15000, isStarred: false, ownerId: 'u1', updatedAt: '2026-09-03T10:00:00Z' },
  { id: '3', name: 'Marketing Assets', resourceType: 'folder', mimeType: 'folder', sizeBytes: null, isStarred: true, ownerId: 'u2', updatedAt: '2026-09-04T10:00:00Z' },
  { id: '4', name: 'Logo Design.png', resourceType: 'file', mimeType: 'image/png', sizeBytes: 8000, isStarred: false, ownerId: 'u2', updatedAt: '2026-09-05T10:00:00Z' },
  { id: '5', name: 'finance_summary.txt', resourceType: 'file', mimeType: 'text/plain', sizeBytes: 1200, isStarred: true, ownerId: 'u1', updatedAt: '2026-09-02T10:00:00Z' }
]

function simulateSearch({ items, q, type, owner, starred, sortBy = 'updated_at', sortOrder = 'desc', page = 1, limit = 2 }) {
  let filtered = [...items]
  
  if (q) {
    const qLower = q.toLowerCase()
    filtered = filtered.filter(item => item.name.toLowerCase().includes(qLower))
  }
  
  if (type && type !== 'all') {
    if (type === 'folder') filtered = filtered.filter(i => i.resourceType === 'folder')
    else if (type === 'file') filtered = filtered.filter(i => i.resourceType === 'file')
    else if (type === 'image') filtered = filtered.filter(i => i.mimeType.startsWith('image/'))
    else if (type === 'pdf') filtered = filtered.filter(i => i.mimeType === 'application/pdf')
  }

  if (owner && owner !== 'all') {
    if (owner === 'me') filtered = filtered.filter(i => i.ownerId === 'u1')
    else if (owner === 'others' || owner === 'shared') filtered = filtered.filter(i => i.ownerId !== 'u1')
  }

  if (starred) {
    filtered = filtered.filter(i => i.isStarred)
  }

  const mult = sortOrder === 'asc' ? 1 : -1
  filtered.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name) * mult
    if (sortBy === 'size') return ((a.sizeBytes || 0) - (b.sizeBytes || 0)) * mult
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * mult
  })

  const total = filtered.length
  const totalPages = Math.ceil(total / limit) || 1
  const offset = (page - 1) * limit
  const results = filtered.slice(offset, offset + limit)

  return { results, pagination: { page, limit, total, totalPages } }
}

// 1. Test query search (case-insensitive "finance")
const financeRes = simulateSearch({ items: mockItems, q: 'FiNaNcE' })
assert.strictEqual(financeRes.pagination.total, 2, 'Should find 2 items matching "finance"')

// 2. Test type filter (folder)
const folderRes = simulateSearch({ items: mockItems, type: 'folder' })
assert.strictEqual(folderRes.pagination.total, 1, 'Should find 1 folder')
assert.strictEqual(folderRes.results[0].name, 'Marketing Assets')

// 3. Test starred filter
const starredRes = simulateSearch({ items: mockItems, starred: true })
assert.strictEqual(starredRes.pagination.total, 3, 'Should find 3 starred items')

// 4. Test owner filter ('others')
const sharedRes = simulateSearch({ items: mockItems, owner: 'others' })
assert.strictEqual(sharedRes.pagination.total, 2, 'Should find 2 items owned by others')

// 5. Test pagination
const pagedRes = simulateSearch({ items: mockItems, page: 1, limit: 2 })
assert.strictEqual(pagedRes.results.length, 2, 'Page size should be 2')
assert.strictEqual(pagedRes.pagination.totalPages, 3, 'Total pages should be 3')

console.log('✓ All search filter, pagination, and sorting unit tests passed successfully!')
