import { useState, useEffect, useCallback } from 'react'
import { loadMessagesFromStorage, loadChatsFromStorage, loadDocumentsFromStorage } from '../utils/localStorage'

/**
 * Global state management hook for documents, chats, and conversations
 * Data is sourced ONLY from backend SQLite database
 * Frontend stores temporary state for UI interactions
 * 
 * Structure:
 * documents: {
 *   [documentId]: {
 *     id: string,
 *     name: string,
 *     filenames: [string],
 *     vectorStoreId: string,
 *     createdAt: timestamp,
 *     chats: [chatId]
 *   }
 * }
 * 
 * chats: {
 *   [chatId]: {
 *     id: string,
 *     name: string,
 *     documentId: string,
 *     createdAt: timestamp,
 *     messages: [messageId]
 *   }
 * }
 * 
 * messages: {
 *   [messageId]: {
 *     id: string,
 *     chatId: string,
 *     role: 'user' | 'assistant' | 'system',
 *     content: string,
 *     timestamp: timestamp,
 *     metadata: { chunks, sources, etc }
 *   }
 * }
 */

export function useAppState() {
  // Load from localStorage first (fast), then merge with backend data
  const [documents, setDocuments] = useState(() => loadDocumentsFromStorage())
  const [chats, setChats] = useState(() => loadChatsFromStorage())
  const [messages, setMessages] = useState(() => loadMessagesFromStorage())
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialize state - data will be loaded from backend via App.jsx
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Document operations
  const addDocument = useCallback((documentData) => {
    const { document_id, fileName, filenames: filenamesFromApi, chunks, vector_store_id, name: nameFromData } = documentData
    const now = Date.now()

    setDocuments(prev => {
      const existing = prev[document_id]
      const filenames = Array.isArray(filenamesFromApi) && filenamesFromApi.length > 0
        ? filenamesFromApi
        : (fileName ? (fileName.includes(',') ? fileName.split(',').map(s => s.trim()).filter(Boolean) : [fileName]) : existing?.filenames || [])
      return {
        ...prev,
        [document_id]: {
          id: document_id,
          name: nameFromData ?? existing?.name ?? document_id,
          filenames: filenames.length ? filenames : (existing?.filenames || []),
          vectorStoreId: vector_store_id || `vector_store_${document_id}`,
          chunks,
          createdAt: existing?.createdAt || now,
          chats: existing?.chats || []
        }
      }
    })
  }, [])

  const renameDocument = useCallback((documentId, newName) => {
    setDocuments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        name: newName
      }
    }))
  }, [])

  const deleteDocument = useCallback((documentId) => {
    // Delete all chats related to this document
    let chatIdsToDelete = []
    
    setChats(prev => {
      chatIdsToDelete = Object.values(prev)
        .filter(chat => chat?.documentId === documentId)
        .map(chat => chat.id)
      
      const updated = { ...prev }
      chatIdsToDelete.forEach(chatId => {
        delete updated[chatId]
      })
      return updated
    })

    // Delete all messages related to deleted chats
    setMessages(prev => {
      const updated = { ...prev }
      chatIdsToDelete.forEach(chatId => {
        Object.keys(updated).forEach(messageId => {
          if (updated[messageId].chatId === chatId) {
            delete updated[messageId]
          }
        })
      })
      return updated
    })

    // Delete the document
    setDocuments(prev => {
      const updated = { ...prev }
      delete updated[documentId]
      return updated
    })
  }, [])

  const addFilesToDocument = useCallback((documentId, newFilenames) => {
    setDocuments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        filenames: [...(prev[documentId]?.filenames || []), ...newFilenames]
      }
    }))
  }, [])

  // Chat operations
  const createChat = useCallback((documentId, chatName, sessionId) => {
    const now = Date.now()
    const chatId = `chat_${now}_${Math.random().toString(36).slice(2, 9)}`

    setChats(prev => {
      const newChat = {
        id: chatId,
        name: chatName || `Chat ${Object.keys(prev).length + 1}`,
        documentId,
        session_id: sessionId,
        createdAt: now,
        messages: []
      }
      return {
        ...prev,
        [chatId]: newChat
      }
    })

    // Add chat to document
    setDocuments(prev => {
      if (!prev[documentId]) return prev
      const updated = {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          chats: [...(prev[documentId].chats || []), chatId]
        }
      }
      return updated
    })

    return chatId
  }, [])

  const renameChat = useCallback((chatId, newName) => {
    setChats(prev => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        name: newName
      }
    }))
  }, [])

  const deleteChat = useCallback((chatId) => {
    // Delete all messages in this chat
    setMessages(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(messageId => {
        if (updated[messageId].chatId === chatId) {
          delete updated[messageId]
        }
      })
      return updated
    })

    // Delete the chat and get its info before deletion
    let documentId = null
    setChats(prev => {
      documentId = prev[chatId]?.documentId
      const updated = { ...prev }
      delete updated[chatId]
      return updated
    })

    // Remove chat from document
    if (documentId) {
      setDocuments(prev => ({
        ...prev,
        [documentId]: {
          ...prev[documentId],
          chats: (prev[documentId]?.chats || []).filter(c => c !== chatId)
        }
      }))
    }
  }, [])

  // Message operations
  const addMessage = useCallback((chatId, role, content, metadata = {}) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    setMessages(prev => ({
      ...prev,
      [messageId]: {
        id: messageId,
        chatId,
        role,
        content,
        timestamp: now,
        metadata
      }
    }))

    // Add message to chat
    setChats(prev => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        messages: [...(prev[chatId]?.messages || []), messageId]
      }
    }))

    return messageId
  }, [])

  const updateMessageMetadata = useCallback((messageId, metadata) => {
    setMessages(prev => {
      const msg = prev[messageId]
      if (!msg) return prev
      return {
        ...prev,
        [messageId]: { ...msg, metadata: { ...(msg.metadata || {}), ...metadata } }
      }
    })
  }, [])

  const updateMessageContent = useCallback((messageId, content) => {
    setMessages(prev => {
      const msg = prev[messageId]
      if (!msg) return prev
      return {
        ...prev,
        [messageId]: { ...msg, content }
      }
    })
  }, [])

  const removeMessage = useCallback((messageId) => {
    // Get the chat ID for this message
    const message = messages[messageId]
    if (!message) return

    // Remove message from messages state
    setMessages(prev => {
      const updated = { ...prev }
      delete updated[messageId]
      return updated
    })

    // Remove message ID from chat's messages array
    const chatId = message.chatId
    setChats(prev => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        messages: (prev[chatId]?.messages || []).filter(m => m !== messageId)
      }
    }))
  }, [messages])

  const getChatMessages = useCallback((chatId) => {
    const chat = chats[chatId]
    if (!chat) return []
    
    return (chat.messages || []).map(messageId => messages[messageId]).filter(Boolean)
  }, [chats, messages])

  const getDocumentChats = useCallback((documentId) => {
    const doc = documents[documentId]
    if (!doc) return []
    
    return (doc.chats || []).map(chatId => chats[chatId]).filter(Boolean)
  }, [documents, chats])

  return {
    // State
    documents,
    chats,
    messages,
    isLoaded,

    // Document operations
    addDocument,
    renameDocument,
    deleteDocument,
    addFilesToDocument,

    // Chat operations
    createChat,
    renameChat,
    deleteChat,
    
    // Bulk clear operations
    clearAllChats: () => {
      setChats({})
      setMessages({})
      // Clear chats array from all documents
      setDocuments(prev => {
        const updated = {}
        Object.keys(prev).forEach(docId => {
          updated[docId] = { ...prev[docId], chats: [] }
        })
        return updated
      })
    },

    // Message operations
    addMessage,
    removeMessage,
    updateMessageMetadata,
    updateMessageContent,
    getChatMessages,
    getDocumentChats,

    // Find chat by backend session_id and document (for search → open chat)
    getChatBySessionAndDocument: useCallback((sessionId, documentId) => {
      return Object.values(chats).find(
        c => (c.session_id === sessionId || c.id === sessionId) && c.documentId === documentId
      ) || null
    }, [chats]),
  }
}
