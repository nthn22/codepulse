import { useState, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useStream from '../hooks/useStream'
import { useAuth } from '../context/AuthContext'
import { detectLanguage } from '../utils/detectLanguage'

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css', 'sql',
]

const PLACEHOLDER = `// Paste your code here and click "Review Code"
function example() {
  const data = fetch('/api/data')
  console.log(data)
  return data
}`

export default function Review() {
  const [code, setCode] = useState(PLACEHOLDER)
  const [language, setLanguage] = useState('javascript')
  const [fileName, setFileName] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // GitHub import state
  const [showGithubInput, setShowGithubInput] = useState(false)
  const [githubUrl, setGithubUrl] = useState('')
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError] = useState(null)

  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)
  const githubInputRef = useRef(null)
  const { user } = useAuth()
  const { response, isStreaming, saved, error, startStream, stopStream } = useStream()

  const loadFile = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setCode(e.target.result)
      setLanguage(detectLanguage(file.name))
      setFileName(file.name)
    }
    reader.readAsText(file)
  }, [])

  const handleFileInput = (e) => {
    loadFile(e.target.files[0])
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  const toggleGithubInput = () => {
    setShowGithubInput((v) => {
      if (!v) setTimeout(() => githubInputRef.current?.focus(), 50)
      return !v
    })
    setGithubError(null)
    setGithubUrl('')
  }

  const handleGithubImport = async (e) => {
    e.preventDefault()
    if (!githubUrl.trim()) return
    setGithubLoading(true)
    setGithubError(null)
    try {
      const res = await fetch(`/api/github/file?url=${encodeURIComponent(githubUrl.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch file')
      setCode(data.content)
      setLanguage(detectLanguage(data.filename))
      setFileName(data.filename)
      setShowGithubInput(false)
      setGithubUrl('')
    } catch (err) {
      setGithubError(err.message)
    } finally {
      setGithubLoading(false)
    }
  }

  const clearEditor = () => {
    setCode(PLACEHOLDER)
    setFileName(null)
  }

  const handleReview = () => {
    if (!code.trim() || isStreaming) return
    startStream(code, language)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Code Review</h1>
            <p className="text-gray-400 text-sm mt-1">
              Paste your code, upload a file, drag one onto the editor, or import from GitHub
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* File upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cc,.cs,.go,.rs,.rb,.php,.swift,.kt,.html,.htm,.css,.sql"
              onChange={handleFileInput}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload File
            </button>

            {/* GitHub import */}
            <button
              onClick={toggleGithubInput}
              className={`px-4 py-2 border rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                showGithubInput
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              From GitHub
            </button>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>

            {isStreaming ? (
              <button
                onClick={stopStream}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleReview}
                disabled={!code.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors cursor-pointer"
              >
                Review Code
              </button>
            )}
          </div>
        </div>

        {/* GitHub URL input — expands below header */}
        {showGithubInput && (
          <form
            onSubmit={handleGithubImport}
            className="flex flex-col gap-2 bg-gray-900 border border-gray-700 rounded-xl p-4"
          >
            <label className="text-xs text-gray-400 font-medium">
              Paste a GitHub file URL (public repos only)
            </label>
            <div className="flex gap-2">
              <input
                ref={githubInputRef}
                type="url"
                value={githubUrl}
                onChange={(e) => { setGithubUrl(e.target.value); setGithubError(null) }}
                placeholder="https://github.com/user/repo/blob/main/src/index.js"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={githubLoading || !githubUrl.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {githubLoading ? 'Loading...' : 'Import'}
              </button>
            </div>
            {githubError && (
              <p className="text-red-400 text-xs">{githubError}</p>
            )}
            <p className="text-gray-600 text-xs">
              Example: github.com/facebook/react/blob/main/packages/react/index.js
            </p>
          </form>
        )}
      </div>

      {/* Editor + Review panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Editor */}
        <div
          className={`rounded-xl overflow-hidden border transition-colors ${
            isDragging ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-gray-800'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-gray-800/50 px-4 py-2 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-gray-800 flex items-center justify-between">
            <span>{fileName ?? 'Your Code'}</span>
            {isDragging && (
              <span className="text-emerald-400 normal-case font-normal">Drop to load file</span>
            )}
            {fileName && !isDragging && (
              <button
                onClick={clearEditor}
                className="text-gray-600 hover:text-gray-400 transition-colors normal-case font-normal"
              >
                clear
              </button>
            )}
          </div>
          <Editor
            height="500px"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 16 },
            }}
          />
        </div>

        {/* Review Output */}
        <div className="rounded-xl overflow-hidden border border-gray-800 flex flex-col">
          <div className="bg-gray-800/50 px-4 py-2 text-xs text-gray-400 font-medium uppercase tracking-wider border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              AI Review
              {isStreaming && (
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              )}
              {saved && user && (
                <span className="text-emerald-400 normal-case font-normal flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>
            {response && !isStreaming && (
              <button
                onClick={() => { navigator.clipboard.writeText(response); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="normal-case font-normal text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            )}
          </div>
          <div className="bg-gray-900 p-5 overflow-y-auto h-[500px]">
            {error ? (
              <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-4">
                {error}
              </div>
            ) : response ? (
              <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-code:text-emerald-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                <p className="text-center">
                  Click <span className="text-emerald-400">"Review Code"</span> to get AI feedback
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
