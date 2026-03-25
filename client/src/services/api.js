// Base URL for all API calls. In development this is empty because Vite's dev server
// proxies /api/* requests to http://localhost:3001 (configured in vite.config.js).
// In production the frontend and backend share the same origin, so no base URL is needed.
const API_URL = import.meta.env.VITE_API_URL || ''

// Reads the JWT token from localStorage and returns an Authorization header object.
// This is spread into fetch options for any request that requires authentication.
function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function healthCheck() {
  const res = await fetch(`${API_URL}/api/health`)
  return res.json()
}

// Registers a new user. On success the server returns a token and basic user info.
// Throws an error with the server's message if registration fails (e.g. email taken).
export async function register(name, email, password) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Registration failed')
  return data
}

// Logs in an existing user and returns a token and user info.
export async function login(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  return data
}

// Fetches the current user's info using the stored token.
// Returns null (instead of throwing) if the token is missing or expired —
// used on page load to silently restore or clear the session.
export async function getMe() {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  return res.json()
}

// Fetches the logged-in user's full review history.
export async function getReviews() {
  const res = await fetch(`${API_URL}/api/reviews`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json()
}

// Fetches a single review by ID.
export async function getReview(id) {
  const res = await fetch(`${API_URL}/api/reviews/${id}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Review not found')
  return res.json()
}
