import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const linkClass = (path) =>
    `transition-colors ${
      location.pathname === path
        ? 'text-emerald-400'
        : 'text-gray-400 hover:text-white'
    }`

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CP</span>
            </div>
            <span className="text-xl font-bold text-white">CodePulse</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/" className={linkClass('/')}>Home</Link>
            <Link to="/review" className={linkClass('/review')}>Review</Link>
            {user && (
              <Link to="/history" className={linkClass('/history')}>History</Link>
            )}

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  Hey, <span className="text-white">{user.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="text-sm px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
