import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const fetchProspects = async () => {
  const response = await api.get('/prospects')
  return response.data
}

export const createProspect = async (prospectData) => {
  const response = await api.post('/prospects', prospectData)
  return response.data
}

export const updateProspect = async (id, updates) => {
  const response = await api.put(`/prospects/${id}`, updates)
  return response.data
}

export const deleteProspect = async (id) => {
  const response = await api.delete(`/prospects/${id}`)
  return response.data
}

// ============= API de Campos =============

export const fetchFields = async () => {
  const response = await api.get('/fields')
  return response.data
}

export const createField = async (fieldData) => {
  const response = await api.post('/fields', fieldData)
  return response.data
}

export const updateField = async (id, updates) => {
  const response = await api.put(`/fields/${id}`, updates)
  return response.data
}

export const deleteField = async (id) => {
  const response = await api.delete(`/fields/${id}`)
  return response.data
}

export default api
