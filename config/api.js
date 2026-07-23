import axios from 'axios'

const api = axios.create({
  baseURL: 'https://fuask-connect-backend.onrender.com/api'
})

export default api
