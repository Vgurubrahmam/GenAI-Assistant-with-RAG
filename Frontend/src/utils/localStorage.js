/**
 * LocalStorage utility for persisting chat state
 * Provides caching layer for messages and chats between page refreshes
 */

const STORAGE_KEYS = {
  CHATS: 'qa_chats',
  MESSAGES: 'qa_messages',
  DOCUMENTS: 'qa_documents'
}

/**
 * Save all messages to localStorage
 */
export const saveMessagesToStorage = (messages) => {
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
  } catch (err) {
    console.error('[STORAGE] Failed to save messages:', err)
  }
}

/**
 * Load messages from localStorage
 */
export const loadMessagesFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES)
    if (stored) return JSON.parse(stored)
  } catch (err) {
    console.error('[STORAGE] Failed to load messages:', err)
  }
  return {}
}

/**
 * Save all chats to localStorage
 */
export const saveChatToStorage = (chats) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats))
  } catch (err) {
    console.error('[STORAGE] Failed to save chats:', err)
  }
}

/**
 * Load chats from localStorage
 */
export const loadChatsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHATS)
    if (stored) return JSON.parse(stored)
  } catch (err) {
    console.error('[STORAGE] Failed to load chats:', err)
  }
  return {}
}

/**
 * Save documents to localStorage
 */
export const saveDocumentsToStorage = (documents) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents))
  } catch (err) {
    console.error('[STORAGE] Failed to save documents:', err)
  }
}

/**
 * Load documents from localStorage
 */
export const loadDocumentsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS)
    if (stored) {
      const documents = JSON.parse(stored)
      Object.keys(documents).forEach((docId) => {
        if (!Array.isArray(documents[docId].chats)) documents[docId].chats = []
      })
      return documents
    }
  } catch (err) {
    console.error('[STORAGE] Failed to load documents:', err)
  }
  return {}
}

/**
 * Clear all stored data
 */
export const clearStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
  } catch (err) {
    console.error('[STORAGE] Failed to clear storage:', err)
  }
}
