import { useState, useRef, useEffect } from 'react'

export default function QueryInterface({ documentId, document, onQuery, isLoading, initialQuery, isReplaceMode }) {
  const [query, setQuery] = useState(initialQuery || '')
  const [k, setK] = useState('5')
  const [keywords, setKeywords] = useState('')
  const [vectorId, setVectorId] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [chunkOverlap, setChunkOverlap] = useState('0')
  const [similarity_threshold, setSimilarityThreshold] = useState('0.5')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (initialQuery && textareaRef.current) {
      setQuery(initialQuery)
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(initialQuery.length, initialQuery.length)
    }
  }, [initialQuery])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      // Use custom vector_id if provided, otherwise use document's
      const targetVectorId = vectorId.trim() || documentId
      onQuery(query, targetVectorId)
      setQuery('')
    }
  }

  return (
    <div className="bg-white rounded-xl card-shadow overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Ask Question
        </h2>
        <p className="text-indigo-100 text-sm mt-1">Query the uploaded document</p>
      </div>

      {/* Document Info */}
      {document && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-3 space-y-2">
          <p className="text-xs text-indigo-600 font-medium">
            <span className="font-semibold">📄 Document:</span> {document.name || document.fileName || documentId}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-600 font-semibold">🔑 Vector Store ID:</span>
            <code className="text-xs bg-indigo-100 px-2 py-1 rounded font-mono text-indigo-900">{document.vectorStoreId || document.vector_store_id}</code>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Query Input */}
        <div>
          <label htmlFor="query" className="block text-sm font-semibold text-slate-700 mb-2">
            Your Question
          </label>
          <textarea
            ref={textareaRef}
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about the document... e.g., What is Python?"
            rows="4"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200"
        >
          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Advanced Options
          </span>
          <svg
            className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${
              showAdvanced ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {/* Advanced Options Panel */}
        {showAdvanced && (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-lg space-y-4 border border-slate-200 animate-in fade-in duration-200">
            {/* Vector Store ID Input */}
            <div>
              <label htmlFor="vectorId" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                🔑 Custom Vector Store ID (optional)
              </label>
              <div className="mt-2 space-y-2">
                <input
                  id="vectorId"
                  type="text"
                  value={vectorId}
                  onChange={(e) => setVectorId(e.target.value)}
                  placeholder={document?.vectorStoreId || document?.vector_store_id || 'vs_xxxxx'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <div className="bg-blue-100 border border-blue-300 rounded px-2 py-1.5 text-xs text-blue-900">
                  <p className="font-semibold">Current Vector ID:</p>
                  <code className="text-xs font-mono block mt-0.5 break-all">{document?.vectorStoreId || document?.vector_store_id || 'Not available'}</code>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Leave empty to use the current document's vector store. Paste a different vector_store_id to query another document.
              </p>
            </div>

            {/* Top K Chunks */}
            <div>
              <label htmlFor="k" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Top K Chunks: <span className="text-blue-600 font-bold">{k}</span>
              </label>
              <input
                type="range"
                id="k"
                min="1"
                max="10"
                value={k}
                onChange={(e) => setK(e.target.value)}
                className="w-full mt-2 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 (Fast)</span>
                <span>10 (Thorough)</span>
              </div>
            </div>

            {/* Chunk Overlap */}
            <div>
              <label htmlFor="chunkOverlap" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Chunk Overlap: <span className="text-blue-600 font-bold">{chunkOverlap}</span>
              </label>
              <input
                type="range"
                id="chunkOverlap"
                min="0"
                max="5"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(e.target.value)}
                className="w-full mt-2 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-500 mt-1">Number of overlapping sentences between chunks</p>
            </div>

            {/* Similarity Threshold */}
            <div>
              <label htmlFor="similarity" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Similarity Threshold: <span className="text-blue-600 font-bold">{similarity_threshold}</span>
              </label>
              <input
                type="range"
                id="similarity"
                min="0"
                max="1"
                step="0.1"
                value={similarity_threshold}
                onChange={(e) => setSimilarityThreshold(e.target.value)}
                className="w-full mt-2 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0 (Any match)</span>
                <span>1 (Exact match)</span>
              </div>
            </div>

            {/* Filter Keywords */}
            <div>
              <label htmlFor="keywords" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Filter Keywords (optional)
              </label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., assessment,rating,criteria"
                className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated keywords to filter results</p>
            </div>

            {/* Options Summary */}
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">Current Options:</p>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Vector Store:</span>
                  <span className="font-mono text-blue-600">{vectorId || (document?.vectorStoreId || documentId)?.substring(0, 15) + '...'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Top K:</span>
                  <span className="font-mono">{k}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overlap:</span>
                  <span className="font-mono">{chunkOverlap}</span>
                </div>
                <div className="flex justify-between">
                  <span>Similarity:</span>
                  <span className="font-mono">{similarity_threshold}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isReplaceMode ? 'Replace question & answer' : 'Search Document'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
