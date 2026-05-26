import { useState, useEffect } from 'react'
import * as api from '../services/api'

export default function SearchChats({ onSelectChat, isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch()
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const performSearch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.searchChats({ keyword: searchTerm.trim(), days: 30 })
      const list = (data && data.results) ? data.results : (Array.isArray(data) ? data : [])
      setResults(list)
    } catch (err) {
      setError('Failed to search chats',err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectResult = (msg) => {
    const sessionId = msg.session_id || null
    const documentId = msg.document_id
    onSelectChat({ sessionId, documentId })
    setSearchTerm('')
    setResults([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-2xl">
        {/* Search Header */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              type="text"
              placeholder="Search chats by keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Searching...</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border-t border-red-200">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && searchTerm && (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-600 font-medium">No results found</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search term</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="divide-y divide-slate-200">
              {results.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleSelectResult(msg)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {msg.question ? (msg.question.length > 60 ? msg.question.slice(0, 60) + '…' : msg.question) : 'Question'}
                      </p>
                      <p className="text-sm text-slate-600 mt-1 truncate">
                        Doc: {msg.document_id || '—'}
                      </p>
                      {msg.answer && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {msg.answer.length > 80 ? msg.answer.slice(0, 80) + '…' : msg.answer}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">
                      {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && !searchTerm && (
            <div className="p-6 text-center text-sm text-slate-600">
              Type to search chats...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

