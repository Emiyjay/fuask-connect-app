import axios from 'axios'
import { clearSession } from '../utils/session'

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://fuask-connect-backend.onrender.com/api',
  timeout: 15000
})

api.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status
    const hasAuthHeader = Boolean(error.config?.headers?.Authorization)

    if (status === 401 && hasAuthHeader) {
      await clearSession()
    }

    return Promise.reject(error)
  }
)

export default api
