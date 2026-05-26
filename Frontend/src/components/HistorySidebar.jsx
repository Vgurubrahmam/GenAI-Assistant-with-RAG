import { useState, useEffect } from 'react'

const SEARCH_DEBOUNCE_MS = 350

export default function HistorySidebar({
  documents,
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onRenameDocument,
  onDeleteDocument,
  onRenameChat,
  onDeleteChat,
  onSearchChats,
}) {
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameType, setRenameType] = useState(null) // 'document' or 'chat'
  const [hoveredId, setHoveredId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([]) // backend search results (chat messages)
  const [searchLoading, setSearchLoading] = useState(false)

  // Dynamic search: call backend searchChats API when user types (debounced)
  useEffect(() => {
    const trimmed = (searchQuery || '').trim()
    if (!trimmed) {
      setSearchResults([])
      return
    }
    if (!onSearchChats || typeof onSearchChats !== 'function') return

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await onSearchChats(trimmed)
        const results = res?.results || []
        setSearchResults(Array.isArray(results) ? results : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchQuery, onSearchChats])

  const handleRenameStart = (id, currentName, type) => {
    setRenamingId(id)
    setRenameValue(currentName)
    setRenameType(type)
  }

  const handleRenameSave = () => {
    if (renamingId && renameValue.trim()) {
      if (renameType === 'document') {
        onRenameDocument(renamingId, renameValue)
      } else if (renameType === 'chat') {
        onRenameChat(renamingId, renameValue)
      }
    }
    setRenamingId(null)
    setRenameValue('')
    setRenameType(null)
  }

  const handleRenameCancel = () => {
    setRenamingId(null)
    setRenameValue('')
    setRenameType(null)
  }

  const handleRenameKeydown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSave()
    } else if (e.key === 'Escape') {
      handleRenameCancel()
    }
  }

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-screen fixed left-0 top-0 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            onNewChat()
            setExpandedDoc(null)
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Search Bar - backend-driven search (GET /chats?keyword=...) */}
      <div className="border-b border-slate-700 p-2 bg-slate-800">
        <div className="relative">
          <input
            type="text"
            placeholder={searchLoading ? 'Searching...' : 'Search chats (backend)'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* History Scroll Area */}
      <div className="flex-1 overflow-y-auto">
        {Object.values(documents).length === 0 ? (
          <div className="p-4 text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-500 font-medium">No documents yet</p>
            <p className="text-xs text-slate-600 mt-1">Upload a document to start</p>
          </div>
        ) : (
          <nav className="space-y-1 p-2">
            {Object.values(documents)
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .filter((doc) => {
                // When backend search is active, show only documents that have matching messages
                if (searchQuery.trim() && searchResults.length > 0) {
                  return searchResults.some((r) => r.document_id === doc.id)
                }
                return true
              })
              .map((doc) => {
                // Chats: when backend search active, show only chats with matching session/document; else local filter by name
                const docChats = (doc.chats || []).map((chatId) => chats[chatId]).filter(Boolean)
                const filteredChats =
                  searchQuery.trim() && searchResults.length > 0
                    ? docChats.filter((chat) =>
                        searchResults.some(
                          (r) =>
                            r.document_id === doc.id &&
                            (r.session_id === chat.session_id || r.session_id === chat.id)
                        )
                      )
                    : docChats.filter((chat) => {
                        if (!chat.name) return false
                        if (searchQuery.trim()) {
                          return chat.name.toLowerCase().includes(searchQuery.toLowerCase())
                        }
                        return true
                      })
                return (
                  <div key={doc.id} className="group">
                  
                  {/* Document Header */}
                  <div className="flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-sm group"
                    onMouseEnter={() => setHoveredId(doc.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                      className="p-0 flex items-center shrink-0"
                      title="Toggle chats"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform shrink-0 ${expandedDoc === doc.id ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Document Name - Clickable to Open Chat */}
                    <button
                      onClick={() => {
                        // Always resolve chat by documentId (avoid stale doc.chats)
                        const docChats = Object.values(chats).filter(c => c?.documentId === doc.id)
                        if (docChats.length > 0) {
                          const newest = docChats.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]
                          onSelectChat(newest.id)
                          setExpandedDoc(doc.id)
                          return
                        }
                        onNewChat(doc.id)
                        setExpandedDoc(doc.id)
                      }}
                      className="flex-1 flex items-center gap-2 min-w-0 text-left hover:text-blue-300 transition-colors"
                      title={doc.chats && doc.chats.length > 0 ? 'Open first chat' : 'Create new chat'}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold">
                          {renamingId === doc.id && renameType === 'document' ? (
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={handleRenameKeydown}
                              onBlur={handleRenameSave}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-slate-700 text-white px-2 py-1 rounded text-sm w-full border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            doc.id
                          )}
                        </p>
                        {(doc.filenames && doc.filenames.length > 0) && (
                          <p className="text-xs text-slate-500 truncate">{doc.filenames.join(', ')}</p>
                        )}
                        {doc.vectorStoreId && (
                          <p className="text-[10px] text-slate-600 truncate">
                            vs: {String(doc.vectorStoreId).length > 24 ? `${String(doc.vectorStoreId).slice(0, 24)}…` : doc.vectorStoreId}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Document Actions */}
                    {(hoveredId === doc.id) && renamingId !== doc.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            handleRenameStart(doc.id, doc.id, 'document')
                          }}
                          className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                          title="Rename"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete document "${doc.id}" and all its chats?`)) {
                              onDeleteDocument(doc.id)
                              setExpandedDoc(null)
                            }
                          }}
                          className="p-1 hover:bg-red-600 hover:bg-opacity-20 rounded text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Chats for this Document Only */}
                  {expandedDoc === doc.id && (
                    <div className="ml-2 space-y-1 mt-1 mb-2">
                      <p className="text-xs text-slate-500 px-3 py-1 font-semibold">
                        Chats ({filteredChats.length})
                      </p>
                      {filteredChats && filteredChats.length > 0 ? (
                        filteredChats
                          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                          .map((chat) => (
                            <div
                              key={chat.id}
                              onMouseEnter={() => setHoveredId(chat.id)}
                              onMouseLeave={() => setHoveredId(null)}
                              onClick={() => onSelectChat(chat.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs group cursor-pointer ${
                                currentChatId === chat.id
                                  ? 'bg-blue-600 bg-opacity-30 text-blue-300 border border-blue-500'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                              </svg>
                              <span className="truncate flex-1 text-left">
                                {renamingId === chat.id && renameType === 'chat' ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={handleRenameKeydown}
                                    onBlur={handleRenameSave}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-slate-600 text-white px-1 py-0 rounded text-xs w-full border border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                ) : (
                                  chat.name
                                )}
                              </span>

                              {/* Chat Actions - Rename & Delete */}
                              {(hoveredId === chat.id) && renamingId !== chat.id && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRenameStart(chat.id, chat.name, 'chat')
                                    }}
                                    className="p-0.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition-colors"
                                    title="Rename chat"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (confirm(`Delete chat "${chat.name}"?`)) {
                                        onDeleteChat(chat.id)
                                      }
                                    }}
                                    className="p-0.5 hover:bg-red-600 hover:bg-opacity-20 rounded text-slate-500 hover:text-red-400 transition-colors"
                                    title="Delete chat"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-slate-600 px-3 py-2 italic">{searchQuery ? 'No matching chats' : 'No chats yet'}</p>
                      )}
                    </div>
                  )}
                </div>
              )
              })
            }
          </nav>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 bg-slate-800 p-3">
        <p className="text-xs text-slate-500 text-center">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          Service Active
        </p>
      </div>
    </div>
  )
}

