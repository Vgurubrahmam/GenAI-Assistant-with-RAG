import { useState, useEffect, useRef } from 'react'
import DocumentUpload from './components/DocumentUpload'
import Header from './components/Header'
import HistorySidebar from './components/HistorySidebar'
import ChatPanel from './components/ChatPanel'
import SearchChats from './components/SearchChats'
import { useAppState } from './hooks/useAppState'
import * as api from './services/api'
import { saveMessagesToStorage, saveChatToStorage, saveDocumentsToStorage } from './utils/localStorage'

function App() {
  const appState = useAppState()
  const [currentChatId, setCurrentChatId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState('chat') // 'chat', 'upload', 'search'
  const [lastUploadedDocumentIds, setLastUploadedDocumentIds] = useState([])
  const uploadInputRef = useRef(null)

  // Load documents and chats from backend on mount (ONLY ONCE)
  useEffect(() => {
    const loadDocumentsAndChats = async () => {
      try {
        // First, check if backend is accessible
        try {
          const _health = await api.checkHealth()
        } catch (healthErr) {
          console.error('[APP] Backend health check failed:', healthErr)
          setError('Backend server is not accessible at http://127.0.0.1:8000. Please ensure it is running.')
          return
        }

        // Load documents
        const documents = await api.getDocuments()
        console.log('[APP] Documents from backend:', documents)
        
        if (documents && Array.isArray(documents)) {
          documents.forEach(doc => {
            appState.addDocument({
              document_id: doc.document_id,
              fileName: doc.filename,
              filenames: doc.filenames,
              vector_store_id: doc.vector_store_id,
              summary: doc.summary,
              uploadedAt: doc.created_at || new Date().toISOString(),
              chunks: 1,
              name: doc.display_name || doc.document_id
            })
          })
        }

        // Load all chats and messages from backend
        try {
          const chatsResponse = await api.searchChats({})
          console.log('[APP] Chats response:', chatsResponse)
          
          if (chatsResponse && chatsResponse.results && Array.isArray(chatsResponse.results)) {
            console.log('[APP] Found', chatsResponse.results.length, 'chat messages')
            
            if (chatsResponse.results.length === 0) {
              console.log('[APP] No chats in database yet')
              return
            }
            
            // Clear all existing chats and messages to rebuild from backend data
            console.log('[APP] Clearing all existing chats and messages')
            appState.clearAllChats()

            // One session per document (ChatGPT-style): group all messages by document_id only
            const docMap = {}
            chatsResponse.results.forEach(msg => {
              const docId = msg.document_id
              if (!docMap[docId]) {
                docMap[docId] = { document_id: docId, messages: [] }
              }
              docMap[docId].messages.push({
                role: 'user',
                content: msg.question,
                timestamp: new Date(msg.created_at).getTime(),
                backendMessageId: msg.id
              })
              if (msg.answer) {
                docMap[docId].messages.push({
                  role: 'assistant',
                  content: msg.answer,
                  timestamp: new Date(msg.created_at).getTime() + 1,
                  backendMessageId: msg.id
                })
              }
            })

            // Sort messages by timestamp within each document, then create one chat per document
            Object.values(docMap).forEach((doc) => {
              doc.messages.sort((a, b) => a.timestamp - b.timestamp)
              const docName = appState.documents[doc.document_id]?.name || doc.document_id
              const chatId = appState.createChat(doc.document_id, docName, null)
              doc.messages.forEach((msg) => {
                appState.addMessage(chatId, msg.role, msg.content, {
                  timestamp: msg.timestamp,
                  backendMessageId: msg.backendMessageId
                })
              })
            })
            
                 } else {
            console.warn('[APP] Invalid chats response format:', chatsResponse)
          }
        } catch (chatErr) {
          console.error('[APP] Error loading chats:', chatErr.message)
        }
      } catch (err) {
        console.error('[APP] Failed to load from backend:', err)
      }
    }
    
    // Load only once when component mounts
    loadDocumentsAndChats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - runs only once on mount

  // Helper function to refetch documents from backend without wiping chats (only remove docs no longer in API)
  const refetchDocuments = async () => {
    try {
      console.log('[APP] Refetching documents from backend...')
      const documents = await api.getDocuments()
      const apiIds = new Set((documents && Array.isArray(documents)) ? documents.map(d => d.document_id) : [])

      // Remove only documents that are no longer in the backend (preserves chats for existing docs)
      Object.keys(appState.documents).forEach(docId => {
        if (!apiIds.has(docId)) appState.deleteDocument(docId)
      })

      // Add or update documents from DB
      if (documents && Array.isArray(documents)) {
        documents.forEach(doc => {
          appState.addDocument({
            document_id: doc.document_id,
            fileName: doc.filename,
            filenames: doc.filenames,
            vector_store_id: doc.vector_store_id,
            summary: doc.summary,
            uploadedAt: doc.created_at || new Date().toISOString(),
            chunks: 1,
            name: doc.display_name || doc.document_id
          })
        })
      }

      console.log('[APP] Documents refetched successfully, total:', Object.keys(appState.documents).length)
    } catch (err) {
      console.error('[APP] Failed to refetch documents:', err)
      setError('Failed to sync documents from database')
    }
  }

  // Open chat from search: create the single chat for document and load all messages from backend
  const openChatFromSearch = async (documentId) => {
    try {
      const doc = appState.documents[documentId]
      if (!doc) {
        setError('Document not found. It may have been deleted.')
        return
      }
      const docName = doc.name || doc.id
      const chatId = appState.createChat(documentId, docName, null)
      setCurrentChatId(chatId)
      setActiveMainTab('chat')
      const historyRes = await api.getChatHistory(documentId)
      const messagesList = historyRes.messages || historyRes.results || (Array.isArray(historyRes) ? historyRes : [])
      const addedIds = []
      for (const msg of messagesList) {
        const uid = appState.addMessage(chatId, 'user', msg.question || '', {})
        addedIds.push(uid)
        if (msg.answer) {
          const aid = appState.addMessage(chatId, 'assistant', msg.answer, {})
          addedIds.push(aid)
        }
      }
      for (let i = 0; i < messagesList.length; i++) {
        const backendId = messagesList[i].id
        const userMsgId = addedIds[i * 2]
        const assistantMsgId = addedIds[i * 2 + 1]
        if (userMsgId) appState.updateMessageMetadata(userMsgId, { backendMessageId: backendId })
        if (assistantMsgId) appState.updateMessageMetadata(assistantMsgId, { backendMessageId: backendId })
      }
    } catch (err) {
      console.error('[APP] openChatFromSearch failed:', err)
      setError('Failed to open chat: ' + err.message)
    }
  }

  // Helper function to refetch all chats from backend (DB-first architecture)
  const refetchChats = async () => {
    try {
      console.log('[APP] Refetching chats from backend...')
      
      // Clear existing chats and messages
      Object.keys(appState.chats).forEach(chatId => {
        appState.deleteChat(chatId)
      })
      
      const chatsResponse = await api.searchChats({})
      if (chatsResponse && chatsResponse.results && Array.isArray(chatsResponse.results)) {
        if (chatsResponse.results.length === 0) {
          console.log('[APP] No chats in database')
          return
        }
        const docMap = {}
        chatsResponse.results.forEach(msg => {
          const docId = msg.document_id
          if (!docMap[docId]) docMap[docId] = { document_id: docId, messages: [] }
          docMap[docId].messages.push({
            role: 'user',
            content: msg.question,
            timestamp: new Date(msg.created_at).getTime(),
            backendMessageId: msg.id
          })
          if (msg.answer) {
            docMap[docId].messages.push({
              role: 'assistant',
              content: msg.answer,
              timestamp: new Date(msg.created_at).getTime() + 1,
              backendMessageId: msg.id
            })
          }
        })
        Object.values(docMap).forEach((doc) => {
          doc.messages.sort((a, b) => a.timestamp - b.timestamp)
          const docName = appState.documents[doc.document_id]?.name || doc.document_id
          const chatId = appState.createChat(doc.document_id, docName, null)
          doc.messages.forEach((msg) => {
            appState.addMessage(chatId, msg.role, msg.content, {
              timestamp: msg.timestamp,
              backendMessageId: msg.backendMessageId
            })
          })
        })
      }
      
      console.log('[APP] Chats refetched successfully, total:', Object.keys(appState.chats).length)
    } catch (err) {
      console.error('[APP] Failed to refetch chats:', err)
    }
  }

  // After upload: create chats for newly uploaded documents and switch to the last one (only when all docs are in state)
  useEffect(() => {
    if (!lastUploadedDocumentIds || lastUploadedDocumentIds.length === 0) return
    const ids = [...lastUploadedDocumentIds]
    const allPresent = ids.every((id) => appState.documents[id])
    if (!allPresent) return // Wait for refetchDocuments to commit; effect will re-run when appState.documents updates
    setLastUploadedDocumentIds([])
    let chatIdToSelect = null
    const lastId = ids[ids.length - 1]
    ids.forEach((docId) => {
      const doc = appState.documents[docId]
      if (!doc) return
      const existing = Object.values(appState.chats).find((c) => c?.documentId === docId)
      if (existing) {
        if (docId === lastId) chatIdToSelect = existing.id
      } else {
        const chatId = appState.createChat(docId, doc.name || doc.id, null)
        if (docId === lastId) chatIdToSelect = chatId
      }
    })
    if (chatIdToSelect) setCurrentChatId(chatIdToSelect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUploadedDocumentIds, appState.documents])

  // Persist app state to localStorage as backup cache (NOT primary storage)
  // Primary storage is app.db on backend
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save to localStorage if we have data (avoid overwriting with empty state)
      if (Object.keys(appState.messages).length > 0) {
        saveMessagesToStorage(appState.messages)
      }
      if (Object.keys(appState.chats).length > 0) {
        saveChatToStorage(appState.chats)
      }
      if (Object.keys(appState.documents).length > 0) {
        saveDocumentsToStorage(appState.documents)
      }
    }, 500) // Debounce to avoid excessive localStorage writes
    
    return () => clearTimeout(timer)
  }, [appState.messages, appState.chats, appState.documents])

  const handleDocumentUpload = async (documentData) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.ingestDocument(documentData.document_id, documentData.files, () => {})

      if (!response || response.status !== 'success') {
        throw new Error(response?.error || 'Upload failed')
      }

      const uploadedDocumentIds = response.document_id ? [response.document_id] : []
      await refetchDocuments()

      return uploadedDocumentIds
      
    } catch (err) {
      console.error('[UPLOAD] Error:', err)
      setError(err.message || 'Upload failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // New Chat: always create a new chat for the target document (same document/vector_id, new conversation like ChatGPT)
  const handleNewChat = (documentId) => {
    if (Object.keys(appState.documents).length === 0) {
      setError('Please upload a document first')
      return
    }
    const targetDoc = documentId
      ? appState.documents[documentId]
      : (currentChatId && appState.chats[currentChatId]?.documentId
          ? appState.documents[appState.chats[currentChatId].documentId]
          : Object.values(appState.documents).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0])
    if (!targetDoc) {
      setError('Document not found')
      return
    }
    // Count existing chats for this document so we can name the new one Chat 1, Chat 2, ...
    const docChatsCount = Object.values(appState.chats).filter((c) => c?.documentId === targetDoc.id).length
    const chatName = `Chat ${docChatsCount + 1}`
    const chatId = appState.createChat(targetDoc.id, chatName, null)
    setCurrentChatId(chatId)
    setActiveMainTab('chat')
  }

  const handleQuery = async (question, documentId, chatId) => {
    console.log('[APP] handleQuery called with:', { question: question.substring(0, 50), documentId, chatId })
    
    if (!chatId) {
      console.error('[APP] No chatId provided')
      setError('Please select a chat')
      return
    }

    // Get the current document to access vector_store_id
    const currentDoc = appState.documents[documentId]
    console.log('[APP] Current document:', { documentId, doc: currentDoc })
    
    if (!currentDoc || !currentDoc.vectorStoreId) {
      console.error('[APP] Document or vectorStoreId not found')
      setError('Document vector store not found')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userMsgId = appState.addMessage(chatId, 'user', question)

      const reader = await api.queryDocument(question, currentDoc.vectorStoreId, chatId)
      let fullAnswer = ''
      let assistantId = null

      if (reader && typeof reader.read === 'function') {
        const decoder = new TextDecoder()
        assistantId = appState.addMessage(chatId, 'assistant', '', {
          answer: '',
          highlighted_chunks: [],
          source_verified: false,
          filters_applied: {}
        })

        let result
        while (!(result = await reader.read()).done) {
          const chunk = decoder.decode(result.value, { stream: true })
          fullAnswer += chunk
          appState.updateMessageContent(assistantId, fullAnswer)
        }
        fullAnswer = fullAnswer.trim()
        appState.updateMessageContent(assistantId, fullAnswer)
      } else {
        fullAnswer = 'No answer found'
        assistantId = appState.addMessage(chatId, 'assistant', fullAnswer, {
          answer: fullAnswer,
          highlighted_chunks: [],
          source_verified: false,
          filters_applied: {}
        })
      }

      // Sync backend message IDs so delete works (backend saved this message with UUID)
      if (userMsgId && assistantId) {
        try {
          const historyRes = await api.getChatHistory(documentId, chatId)
          const messagesList = historyRes.messages || historyRes.results || (Array.isArray(historyRes) ? historyRes : [])
          const lastBackend = messagesList.length ? messagesList[messagesList.length - 1] : null
          if (lastBackend?.id) {
            appState.updateMessageMetadata(userMsgId, { backendMessageId: lastBackend.id })
            appState.updateMessageMetadata(assistantId, { backendMessageId: lastBackend.id })
          }
        } catch (syncErr) {
          console.warn('[APP] Could not sync backend message IDs:', syncErr)
        }
      }
    } catch (err) {
      console.error('[APP] Query error:', err)
      setError('Failed to fetch answer: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handler for deleting a message (backendMessageId from API, or frontend id for fallback)
  const handleDeleteMessage = async (messageIdOrBackendId) => {
    try {
      await api.deleteChatMessage(messageIdOrBackendId)
      await refetchChats()
    } catch (err) {
      console.error('[APP] Error deleting message:', err)
      setError('Failed to delete message: ' + err.message)
    }
  }

  // Replace old Q&A pair with new question and new answer (edit-in-place)
  const handleReplaceAndQuery = async (question, backendMessageId, userMessageId, documentId, chatId) => {
    try {
      const messagesInChat = appState.getChatMessages(chatId)
      let toRemove = []
      if (backendMessageId) {
        toRemove = messagesInChat.filter((m) => m.metadata?.backendMessageId === backendMessageId)
        if (toRemove.length > 0) {
          await api.deleteChatMessage(backendMessageId)
        }
      }
      if (toRemove.length === 0 && userMessageId) {
        const idx = messagesInChat.findIndex((m) => m.id === userMessageId)
        if (idx !== -1 && idx + 1 < messagesInChat.length) {
          toRemove = [messagesInChat[idx], messagesInChat[idx + 1]]
        }
      }
      toRemove.forEach((m) => appState.removeMessage(m.id))
      await handleQuery(question, documentId, chatId)
    } catch (err) {
      console.error('[APP] Error replacing message:', err)
      setError('Failed to replace: ' + err.message)
    }
  }

  // Handler for clearing a session (all messages - with DB sync)
  const handleClearSession = async (sessionId) => {
    try {
      console.log('[APP] Starting session clear:', sessionId)
      await api.deleteChatSession(sessionId)
      setCurrentChatId(null)
      // Refetch chats to ensure local state matches DB
      await refetchChats()
      console.log('[APP] Session cleared and refetched:', sessionId)
    } catch (err) {
      console.error('[APP] Error clearing session:', err)
      setError('Failed to clear session: ' + err.message)
    }
  }

  // Handler for renaming document (with DB sync)
  const handleRenameDocument = async (docId, newName) => {
    try {
      console.log('[APP] Starting document rename:', { docId, newName })
      await api.updateDocument(docId, newName)
      // Refetch documents to ensure local state matches DB
      await refetchDocuments()
      console.log('[APP] Document renamed and refetched:', { docId, newName })
    } catch (err) {
      console.error('[APP] Error renaming document:', err)
      setError('Failed to rename document: ' + err.message)
    }
  }

  // Handler for deleting document (with DB sync)
  const handleDeleteDocument = async (docId) => {
    try {
      console.log('[APP] Starting document deletion:', docId)
      await api.deleteDocument(docId)
      setCurrentChatId(null)
      // Refetch all data (documents and chats) to ensure consistency
      await refetchDocuments()
      await refetchChats()
      console.log('[APP] Document deleted and data refetched:', docId)
    } catch (err) {
      console.error('[APP] Error deleting document:', err)
      setError('Failed to delete document: ' + err.message)
    }
  }

  // Handler for deleting chat (with DB sync)
  const handleDeleteChat = async (chatId) => {
    try {
      console.log('[APP] Starting chat deletion:', chatId)
      
      // Delete the chat session (which cascades to delete messages)
      await api.deleteChatSession(chatId)
      
      if (currentChatId === chatId) {
        setCurrentChatId(null)
      }
      
      // Refetch chats to ensure local state matches DB
      await refetchChats()
      console.log('[APP] Chat deleted and refetched:', chatId)
    } catch (err) {
      console.error('[APP] Error deleting chat:', err)
      setError('Failed to delete chat: ' + err.message)
    }
  }

  // Handler for renaming chat (local only - backend has no session name/title)
  const handleRenameChat = (chatId, newName) => {
    appState.renameChat(chatId, newName)
  }

  const currentChat = appState.chats[currentChatId]
  const currentDocument = currentChat ? appState.documents[currentChat.documentId] : null
  const currentMessages = currentChatId ? appState.getChatMessages(currentChatId) : []

  // Close sidebar when a chat is selected on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [currentChatId])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 font-semibold text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header with mobile toggle */}
      <div className="relative z-50">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onUploadClick={() => setActiveMainTab('upload')}
          onSearch={() => setActiveMainTab('search')}
        />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Fixed (Mobile and Desktop) */}
        {appState.isLoaded && (
          <div
            className={`${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0 fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out`}
          >
            <HistorySidebar
              documents={appState.documents}
              chats={appState.chats}
              currentChatId={currentChatId}
              onSelectChat={(chatId) => {
                setCurrentChatId(chatId)
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
              onNewChat={(documentId) => {
                handleNewChat(documentId)
                if (window.innerWidth < 768) setSidebarOpen(false)
                setActiveMainTab('chat')
              }}
              onRenameDocument={handleRenameDocument}
              onDeleteDocument={handleDeleteDocument}
              onRenameChat={handleRenameChat}
              onDeleteChat={handleDeleteChat}
              onSearchChats={async (keyword) => api.searchChats({ keyword: keyword || undefined })}
            />
          </div>
        )}

        {/* Main Content Area - Adjusted for fixed sidebar on desktop */}
        <div className="flex-1 flex flex-col overflow-hidden w-full md:ml-64">
          {/* If chat is selected, show chat panel */}
          {currentChatId && currentChat ? (
            <ChatPanel
              chat={currentChat}
              document={currentDocument}
              messages={currentMessages}
              onQuery={handleQuery}
              onReplaceAndQuery={handleReplaceAndQuery}
              isLoading={isLoading}
              onDeleteMessage={handleDeleteMessage}
              onClearSession={handleClearSession}
            />
          ) : (
            /* Default view: upload and initial interface */
            <main className="flex-1 overflow-y-auto">
              <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
                {/* Welcome Section */}
                <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
                  <div className="text-center mb-8 md:mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Document Q&A</h1>
                    <p className="text-base md:text-lg text-slate-600">Upload documents and ask questions to get intelligent answers</p>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <div className="max-w-md mx-auto mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="text-red-700 text-sm md:text-base">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Flex Column Layout */}
                  <div className="flex flex-col gap-6 md:gap-8 pb-16 px-2 md:px-0 xl:ml-16">
                    {/* Upload & Recent Docs */}
                    <div className="space-y-6">
                      {/* DocumentUpload is now rendered outside in a hidden div */}

                      {/* Recent Documents */}
                      {Object.keys(appState.documents).length > 0 && (
                        <div className="bg-white rounded-xl card-shadow overflow-hidden">
                          <div className="bg-linear-to-r from-slate-600 to-slate-700 p-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                              </svg>
                              Quick Actions
                            </h3>
                          </div>
                          <div className="p-6 space-y-2">
                            <button
                              onClick={() => {
                                handleNewChat()
                                if (window.innerWidth < 768) setSidebarOpen(false)
                              }}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              New Chat
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info & Getting Started */}
                    <div className="space-y-6 flex flex-col">
                      {Object.keys(appState.documents).length === 0 ? (
                        <div className="bg-white rounded-xl p-8 md:p-12 border border-slate-200 text-center card-shadow">
                          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Get Started</h3>
                          <p className="text-slate-600 mb-6 text-sm md:text-base">
                            Start by uploading a PDF or TXT document. You'll then be able to ask questions and get intelligent answers backed by the document content.
                          </p>
                          <div className="space-y-4 text-left max-w-sm mx-auto text-sm md:text-base">
                            <div className="flex gap-3">
                              <div className="shrink-0">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white font-semibold text-sm">1</div>
                              </div>
                              <p className="text-slate-700"><span className="font-semibold">Upload</span> a PDF or TXT file with a unique document ID</p>
                            </div>
                            <div className="flex gap-3">
                              <div className="shrink-0">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white font-semibold text-sm">2</div>
                              </div>
                              <p className="text-slate-700"><span className="font-semibold">Create</span> a new chat for your document</p>
                            </div>
                            <div className="flex gap-3">
                              <div className="shrink-0">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white font-semibold text-sm">3</div>
                              </div>
                              <p className="text-slate-700"><span className="font-semibold">Ask</span> questions about the content</p>
                            </div>
                            <div className="flex gap-3">
                              <div className="shrink-0">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white font-semibold text-sm">4</div>
                              </div>
                              <p className="text-slate-700"><span className="font-semibold">Explore</span> supporting passages and sources</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-6">
                          <div className="bg-white rounded-xl card-shadow overflow-hidden">
                            <div className="bg-linear-to-r from-green-600 to-emerald-600 p-6">
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Ready to Chat
                              </h3>
                            </div>
                            <div className="p-6">
                              <p className="text-slate-700 font-medium mb-4">You have {Object.keys(appState.documents).length} document{Object.keys(appState.documents).length !== 1 ? 's' : ''} uploaded</p>
                              <p className="text-slate-600 text-sm mb-4">Start a new chat to ask questions about your documents. Your chat history will be preserved in the sidebar.</p>
                              <button
                                onClick={() => {
                                  handleNewChat()
                                  if (window.innerWidth < 768) setSidebarOpen(false)
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Start New Chat
                              </button>
                            </div>
                          </div>

                          {/* Statistics */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                              <p className="text-2xl font-bold text-blue-600">{Object.keys(appState.documents).length}</p>
                              <p className="text-sm text-slate-600 mt-1">Documents</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-slate-200">
                              <p className="text-2xl font-bold text-purple-600">
                                {Object.values(appState.chats).length}
                              </p>
                              <p className="text-sm text-slate-600 mt-1">Chats</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          )}
        </div>
      </div>

      {/* Upload Modal → Integrated Panel */}
      {activeMainTab === 'upload' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Upload Documents</h2>
              <button
                onClick={() => setActiveMainTab('chat')}
                className="text-slate-500 hover:text-slate-700 p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              <DocumentUpload ref={uploadInputRef} onUploadSuccess={async (data) => {
                const uploadedIds = await handleDocumentUpload(data)
                setActiveMainTab('chat')
                if (uploadedIds && uploadedIds.length > 0) setLastUploadedDocumentIds(uploadedIds)
              }} isLoading={isLoading} />
            </div>
          </div>
        </div>
      )}

      {/* Search Chats Modal → Integrated Panel */}
      {activeMainTab === 'search' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Search Chats</h2>
              <button
                onClick={() => setActiveMainTab('chat')}
                className="text-slate-500 hover:text-slate-700 p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              <SearchChats 
                isOpen={activeMainTab === 'search'}
                onClose={() => setActiveMainTab('chat')}
                onSelectChat={(payload) => {
                  if (typeof payload === 'string') {
                    setCurrentChatId(payload)
                    setActiveMainTab('chat')
                    return
                  }
                  const { documentId } = payload || {}
                  if (!documentId) return
                  const docChats = appState.getDocumentChats(documentId)
                  if (docChats.length > 0) {
                    setCurrentChatId(docChats[0].id)
                    setActiveMainTab('chat')
                    return
                  }
                  openChatFromSearch(documentId)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm text-slate-600">
            Document-Aware QA Service • Powered by RAG + Local LLM
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

