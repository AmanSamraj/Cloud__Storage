import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const foldersApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

async function request(config) {
  try {
    const response = await foldersApi.request(config)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Folder request failed')
  }
}

export function getRootContents() {
  return request({ method: 'GET', url: '/folders/root' })
}

export function getFolderContents(folderId) {
  return request({ method: 'GET', url: `/folders/${folderId}` })
}

export function getFolderTree() {
  return request({ method: 'GET', url: '/folders/tree' })
}

export function createFolder(name, parentId = null) {
  return request({
    method: 'POST',
    url: '/folders',
    data: { name, parentId },
  })
}

export function updateFolder(folderId, changes) {
  return request({ method: 'PATCH', url: `/folders/${folderId}`, data: changes })
}

export function deleteFolder(folderId) {
  return request({ method: 'DELETE', url: `/folders/${folderId}` })
}

export function updateFile(fileId, changes) {
  return request({ method: 'PATCH', url: `/files/${fileId}`, data: changes })
}

export function deleteFile(fileId) {
  return request({ method: 'DELETE', url: `/files/${fileId}` })
}

export function getFileDownloadUrl(fileId) {
  return request({ method: 'GET', url: `/files/${fileId}` })
}

export function uploadFile(file, folderId = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (folderId) formData.append('folderId', folderId)

  return request({
    method: 'POST',
    url: '/files/upload',
    data: formData,
  })
}
