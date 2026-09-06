import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const trashApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

async function request(config) {
  try {
    const response = await trashApi.request(config)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Trash request failed')
  }
}

export function getTrashItems() {
  return request({ method: 'GET', url: '/trash' })
}

export function restoreTrashItem(resourceType, resourceId) {
  return request({
    method: 'POST',
    url: '/trash/restore',
    data: { resourceType, resourceId },
  })
}

export function permanentDeleteItem(resourceType, resourceId) {
  return request({
    method: 'DELETE',
    url: `/trash/${resourceType}/${resourceId}`,
  })
}

export function emptyTrash() {
  return request({
    method: 'DELETE',
    url: '/trash/empty',
  })
}
