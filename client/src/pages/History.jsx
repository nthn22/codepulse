import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../context/AuthContext'
import { getReviews } from '../services/api'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false)
  const codePreview = review.code.split('\n').slice(0, 3).join('\n')

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              {review.language}
            </span>
            <span className="text-xs text-gray-500">{timeAgo(review.createdAt)}</span>
          </div>
          <pre className="text-xs text-gray-500 font-mono truncate whitespace-pre-wrap line-clamp-2">
            {codePreview}
          </pre>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 text-gray-500 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-800">
          {/* Code */}
          <div className="px-6 py-4 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">Code</p>
            <pre className="text-xs text-gray-300 font-mono bg-gray-800 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
              {review.code}
            </pre>
          </div>
          {/* Review */}
          <div className="px-6 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">AI Review</p>
            <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-code:text-emerald-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{review.response}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function History() {
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    getReviews()
      .then(setReviews)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-4 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <p className="text-gray-400 mb-4">Sign in to see your review history.</p>
        <Link
          to="/login"
          className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Review History</h1>
        <p className="text-gray-400 text-sm mt-1">
          {reviews.length === 0 ? 'No reviews yet' : `${reviews.length} review${reviews.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {error && (
        <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {reviews.length === 0 && !error ? (
        <div className="text-center py-24 text-gray-600">
          <p className="mb-4">You haven&apos;t reviewed any code yet.</p>
          <Link
            to="/review"
            className="inline-block px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Start a Review
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}
