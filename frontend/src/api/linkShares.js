import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
const linkApi = axios.create({ baseURL: API_URL, withCredentials: true })

async function request(config) {
  try {
    const response = await linkApi.request(config)
    return response.data
  } catch (error) {
    const requestError = new Error(error.response?.data?.error || 'Public link request failed')
    requestError.status = error.response?.status
    throw requestError
  }
}

export function createLinkShare(data) {
  return request({ method: 'POST', url: '/link-shares', data })
}

export function revokeLinkShare(linkId) {
  return request({ method: 'DELETE', url: `/link-shares/${linkId}` })
}

export function getPublicLink(token, password) {
  return request({
    method: 'GET',
    url: `/link/${token}`,
    headers: password ? { 'x-share-password': password } : undefined,
  })
}
