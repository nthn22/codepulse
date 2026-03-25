import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, getMe } from '../services/api'

// React Context lets us share data (the logged-in user) across the entire component
// tree without manually passing it as a prop through every component level.
// Any component can call useAuth() to get the current user and auth functions.
const AuthContext = createContext(null)

// AuthProvider wraps the whole app (see App.jsx) and holds the single source
// of truth for authentication state.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)     // null = logged out, object = logged in
  const [loading, setLoading] = useState(true) // true while we check for an existing session

  // On first render, check if the user already has a token stored from a previous session.
  // This is how "stay logged in" works — we read the token from localStorage, call /api/auth/me
  // to validate it and get the user's info, and restore the session automatically.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false) // no token, definitely logged out
      return
    }
    getMe()
      .then((u) => setUser(u))     // token is valid — restore the session
      .finally(() => setLoading(false)) // either way, we're done loading
  }, [])

  // Calls the login API, stores the returned token in localStorage, and updates state.
  // useCallback prevents this function from being recreated on every render.
  const login = useCallback(async (email, password) => {
    const { token, user } = await apiLogin(email, password)
    localStorage.setItem('token', token) // persist token so it survives page refreshes
    setUser(user)
  }, [])

  const register = useCallback(async (name, email, password) => {
    const { token, user } = await apiRegister(name, email, password)
    localStorage.setItem('token', token)
    setUser(user)
  }, [])

  // Clears the token and resets user to null (logged-out state)
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — makes consuming the context cleaner.
// Components call: const { user, login, logout } = useAuth()
// instead of: const { user, login, logout } = useContext(AuthContext)
export function useAuth() {
  return useContext(AuthContext)
}
