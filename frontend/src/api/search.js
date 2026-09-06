import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const searchApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

async function request(config) {
  try {
    const response = await searchApi.request(config)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Search request failed')
  }
}

export function searchResources(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.q !== undefined && params.q !== '') queryParams.set('q', params.q)
  if (params.type && params.type !== 'all') queryParams.set('type', params.type)
  if (params.owner && params.owner !== 'all') queryParams.set('owner', params.owner)
  if (params.starred !== undefined && params.starred !== null && params.starred !== '') {
    queryParams.set('starred', params.starred)
  }
  if (params.sortBy) queryParams.set('sortBy', params.sortBy)
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
  if (params.page) queryParams.set('page', params.page)
  if (params.limit) queryParams.set('limit', params.limit)

  const queryString = queryParams.toString()
  return request({
    method: 'GET',
    url: `/search${queryString ? `?${queryString}` : ''}`,
  })
}

export function toggleStar(resourceType, resourceId, star = true) {
  return request({
    method: 'POST',
    url: '/search/star',
    data: { resourceType, resourceId, star },
  })
}
