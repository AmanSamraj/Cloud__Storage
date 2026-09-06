import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const starsApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

async function request(config) {
  try {
    const response = await starsApi.request(config)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Stars request failed')
  }
}

export function getStarredItems() {
  return request({ method: 'GET', url: '/stars' })
}

export function starItem(resourceType, resourceId) {
  return request({
    method: 'POST',
    url: '/stars',
    data: { resourceType, resourceId },
  })
}

export function unstarItem(resourceType, resourceId) {
  return request({
    method: 'DELETE',
    url: `/stars/${resourceType}/${resourceId}`,
  })
}
