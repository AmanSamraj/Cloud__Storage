import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const sharesApi = axios.create({ baseURL: API_URL, withCredentials: true })

async function request(config) {
  try {
    const response = await sharesApi.request(config)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Share request failed')
  }
}

export function listShares(resourceType, resourceId) {
  return request({ method: 'GET', url: `/shares/${resourceType}/${resourceId}` })
}

export function createShare(data) {
  return request({ method: 'POST', url: '/shares', data })
}

export function updateShare(shareId, role) {
  return request({ method: 'PATCH', url: `/shares/${shareId}`, data: { role } })
}

export function revokeShare(shareId) {
  return request({ method: 'DELETE', url: `/shares/${shareId}` })
}
