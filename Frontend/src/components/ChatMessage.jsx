import { useState } from 'react'

export default function ChatMessage({ message, onDelete, onEditQuery }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [showActions, setShowActions] = useState(false)

  if (isSystem) {
    return (
      <div className="flex justify-center py-4 px-4">
        <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 max-w-md">
          <p className="text-xs text-slate-600 font-medium">{message.content}</p>
        </div>
      </div>
    )
  }

// Parse assistant response to extract source, answer, and summary
const parseResponse = (content) => {
  let source = null
  let answer = content
  let summary = null
    
const sourceMatch = content.match(/📄 Source: ([^\n]+)/)
if (sourceMatch) {
  source = sourceMatch[1]
}
    
    const summaryMatch = content.match(/📋 Document Summary: ([^]*?)$/)
    if (summaryMatch) {
      summary = summaryMatch[1].trim()
    }
    
    // Extract answer (content between dividers or everything if no dividers)
    const dividerPattern = /━+/g
    const parts = content.split(dividerPattern)
    if (parts.length >= 3) {
      answer = parts[1].trim() // Middle part is the answer
    } else if (parts.length === 2) {
      answer = parts[1].trim()
    } else {
      // Remove source and summary if they exist to get just the answer
      answer = content
        .replace(/📄 Source: [^\n]+\n/g, '')
        .replace(/📋 Document Summary: [^]*$/g, '')
        .replace(/━+/g, '')
        .trim()
    }
    
    // Clean up any remaining inline citations in answer (e.g., "(from section X)")
    answer = answer
      .replace(/\s*\([^)]*section\s+\d+[^)]*\)/gi, '')
      .replace(/\s*\([^)]*from\s+[^)]*\.pdf[^)]*\)/gi, '')
      .replace(/\s*\([^)]*lecturenotes_ml\.pdf[^)]*\)/gi, '')
      .trim()
    
    return { source, answer, summary }
  }

  const { source, answer, summary } = !isUser ? parseResponse(message.content) : { source: null, answer: message.content, summary: null }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      <div
        className={`w-full max-w-3xl ${
          isUser
            ? 'mr-4'
            : ''
        }`}
      >
        {/* Source Info - Diff Style */}
        {source && (
          <div className="mb-3 flex justify-start">
            <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg px-4 py-2.5 text-sm text-emerald-900 max-w-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">Source</span>
                  <p className="font-medium text-emerald-900">{source}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Message */}
        <div
          className={`${
            isUser
              ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none ml-auto'
              : 'bg-slate-200 text-slate-900 rounded-2xl rounded-tl-none'
          } px-4 py-3 shadow-sm max-w-2xl relative group`}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>

          <p
            className={`text-xs mt-2 ${
              isUser ? 'text-blue-100 opacity-70' : 'text-slate-500 opacity-70'
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          {/* Actions: Copy, Edit (user query only), Delete (user query only) */}
          {showActions && (
            <div className={`absolute top-1 right-1 flex gap-0.5 ${isUser ? 'text-blue-100' : 'text-slate-500'}`}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(answer).catch(() => {})
                }}
                className="p-1 rounded hover:opacity-80"
                title="Copy"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2zM16 8a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8z" />
                </svg>
              </button>
              {isUser && onEditQuery && (
                <button
                  onClick={() => {
                    onEditQuery(answer, message.metadata?.backendMessageId, message.id)
                  }}
                  className="p-1 rounded hover:opacity-80"
                  title="Edit query"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {isUser && onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Delete this message?')) {
                      onDelete(message.metadata?.backendMessageId || message.id)
                    }
                  }}
                  className="p-1 rounded hover:opacity-80"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Document Summary - Diff Style */}
        {summary && (
          <div className="mt-3 flex justify-start">
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg px-4 py-2.5 text-sm text-amber-900 max-w-2xl shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-lg">📋</span>
                <div className="flex flex-col w-full">
                  <span className="text-xs font-semibold tracking-wide text-amber-700 uppercase">Document Summary</span>
                  <p className="font-medium text-amber-900 leading-relaxed mt-1">{summary}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metadata for Assistant Messages */}
        {!isUser && message.metadata && (
          <div className="mt-3 space-y-2 text-xs flex justify-start">
            {/* Source Verification Badge */}
            {message.metadata.source_verified && (
              <div className="flex items-center gap-1 text-green-700 bg-green-50 rounded px-2 py-1 w-fit">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Source Verified</span>
              </div>
            )}

            {/* Chunks Info */}
            {message.metadata.chunks && message.metadata.chunks.length > 0 && (
              <div className="bg-slate-100 rounded px-2 py-1">
                <p className="font-semibold text-slate-700">
                  {message.metadata.chunks.length} supporting chunk{message.metadata.chunks.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

