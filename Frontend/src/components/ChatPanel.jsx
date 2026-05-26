import { useEffect, useRef, useState } from 'react'
import ChatMessage from './ChatMessage'
import QueryInterface from './QueryInterface'
import ResultsPanel from './ResultsPanel'

export default function ChatPanel({
  chat,
  document,
  messages,
  onQuery,
  onReplaceAndQuery,
  isLoading,
  onDeleteMessage,
}) {
  const [editQueryValue, setEditQueryValue] = useState(null)
  const [replaceBackendMessageId, setReplaceBackendMessageId] = useState(null)
  const [replaceUserMessageId, setReplaceUserMessageId] = useState(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  const handleEditQuery = (queryText, backendMessageId, userMessageId) => {
    setEditQueryValue(queryText)
    setReplaceBackendMessageId(backendMessageId || null)
    setReplaceUserMessageId(userMessageId || null)
  }

  const handleQuerySubmit = (question) => {
    if (replaceBackendMessageId || replaceUserMessageId) {
      onReplaceAndQuery(question, replaceBackendMessageId, replaceUserMessageId, document.id, chat.id)
      setReplaceBackendMessageId(null)
      setReplaceUserMessageId(null)
    } else {
      onQuery(question, document.id, chat.id)
    }
    setEditQueryValue(null)
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!chat || !document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-600 font-medium">Select a chat or create a new one</p>
          <p className="text-slate-500 text-sm mt-1">Start by uploading a document and asking a question</p>
        </div>
      </div>
    )
  }

  // Use only the current chat's messages (from app state / props) – not localStorage or DB directly
  const messageList = Array.isArray(messages) ? messages : []
  const sortedMessages = [...messageList].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  const uniqueFiles = Array.from(new Set((document.filenames || []).filter(Boolean)))
  // const messageCount = messageList.length

  return (
    <div className="flex-1 flex flex-col bg-linear-to-br from-slate-50 to-slate-100">
      {/* Chat Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
        
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-4xl mx-auto w-full"
      >
        {sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-600 font-medium">No messages yet</p>
              <p className="text-slate-500 text-sm mt-1">Ask a question about {document.id}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Top metadata: Document ID, File(s), Vector Store ID */}
            {sortedMessages.length > 0 && (
              <div className="mb-4 pb-4 border-b border-slate-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-slate-900 truncate">{chat.name}</h2>
                      <p className="text-sm text-blue-900 mt-1 truncate">
                        <span className="font-semibold">Document:</span> {document.id}
                      </p>
                      <p className="text-xs text-blue-800 mt-1 truncate">
                        <span className="font-semibold">File(s):</span> {uniqueFiles.length > 0 ? uniqueFiles.join(', ') : '—'}
                      </p>
                      <p className="text-xs text-blue-800 mt-1 truncate">
                        <span className="font-semibold">Vector Store ID:</span> {document.vectorStoreId || '—'}
                      </p>
                    </div>
                    {/* {onClearSession && (
                      <button
                        onClick={() => {
                          if (messageCount > 0 && confirm(`Clear all ${messageCount} message(s) from this chat?`)) {
                            onClearSession(chat.id)
                          }
                        }}
                        disabled={messageCount === 0}
                        className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={messageCount > 0 ? `Clear ${messageCount} message(s)` : 'No messages to clear'}
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {messageCount > 0 ? `Clear All` : 'Clear'}
                      </button>
                    )} */}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {sortedMessages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                index={index}
                onDelete={onDeleteMessage}
                onEditQuery={handleEditQuery}
              />
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Query Input Area */}
      <div className="border-t border-slate-200 bg-white shadow-lg sticky bottom-0">
        <div className="max-w-4xl mx-auto w-full px-6 py-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Results Panel - Show when available */}
            {!isLoading && sortedMessages.length > 0 && sortedMessages[sortedMessages.length - 1].role === 'assistant' && (
              <div className="mb-4 pb-4 border-b border-slate-200">
                <ResultsPanel results={sortedMessages[sortedMessages.length - 1].metadata} />
              </div>
            )}

            {/* Query Interface */}
            <QueryInterface
              documentId={document.id}
              document={document}
              onQuery={handleQuerySubmit}
              isLoading={isLoading}
              initialQuery={editQueryValue}
              isReplaceMode={!!(replaceBackendMessageId || replaceUserMessageId)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
