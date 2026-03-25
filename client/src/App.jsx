import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Review from './pages/Review'
import Login from './pages/Login'
import Register from './pages/Register'
import History from './pages/History'

// App is the root component. It sets up two things that wrap the entire UI:
//
// 1. BrowserRouter — enables client-side routing. React Router intercepts
//    link clicks and swaps components without doing a full page reload.
//    The actual URL in the address bar still changes, making navigation
//    feel like a normal website.
//
// 2. AuthProvider — makes the logged-in user available to every component
//    in the tree via the useAuth() hook. It must wrap the Navbar and all
//    pages so they can read auth state.
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-950 text-gray-100">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Routes renders whichever Route matches the current URL path */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/review" element={<Review />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
