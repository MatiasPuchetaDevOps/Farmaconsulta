import axios from 'axios'

export const api = axios.create({
  // "||" (no "??"): si VITE_API_URL quedó como string vacío en el build
  // (pasó en el deploy de EasyPanel), "??" no lo detecta y el baseURL
  // termina vacío, mandando los requests a rutas sin /api.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si un baseURL mal configurado o un proxy caído hacen que la "API" responda
// con el HTML de la SPA (o cualquier HTML) en vez de JSON, cortamos acá:
// de lo contrario ese string queda guardado en un useState<X[]> y explota
// como "TypeError: x.map is not a function" en el render.
api.interceptors.response.use((response) => {
  const contentType = String(response.headers['content-type'] ?? '')
  if (typeof response.data === 'string' && contentType.includes('text/html')) {
    return Promise.reject(new Error('La API respondió HTML en lugar de JSON. Revisá VITE_API_URL y el estado del backend.'))
  }
  return response
})
