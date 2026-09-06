import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const recentApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

async function request(config) {
  try {
    const response = await recentApi.request(config)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Recent items request failed')
  }
}

export function getRecentItems(limit = 50) {
  return request({
    method: 'GET',
    url: `/recent?limit=${limit}`,
  })
}
