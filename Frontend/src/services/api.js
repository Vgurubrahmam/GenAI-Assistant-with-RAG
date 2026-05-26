/**
 * API Service Layer
 * Centralized backend communication module for Document-Aware QA System
 * 
 * Features:
 * - Document management (CRUD operations)
 * - Chat history and session management
 * - Document ingestion with progress tracking
 * - Query processing with streaming support
 * - Unified error handling
 * 
 * Base URL: http://127.0.0.1:8000
 */

const API_BASE_URL = 'http://127.0.0.1:8000'

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Centralized HTTP request handler with error management
 * @param {string} url - Full API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} Raw response object
 * @throws {Error} Detailed API error information
 */
const makeRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }
  
  const response = await fetch(url, defaultOptions)
  
  if (!response.ok) {
    let errorMessage = `API Error ${response.status}: ${response.statusText}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorMessage
    // eslint-disable-next-line no-unused-vars
    } catch (_e) {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage)
  }
  
  return response
}

/**
 * Parse JSON response safely
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed JSON data
 */
const parseJSON = async (response) => {
  try {
    return await response.json()
  // eslint-disable-next-line no-unused-vars
  } catch (_e) {
    throw new Error('Failed to parse API response')
  }
}

/**
 * ============================================================================
 * HEALTH CHECK
 * ============================================================================
 */

/**
 * Verify backend service availability
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
  const response = await makeRequest(`${API_BASE_URL}/`)
  return await parseJSON(response)
}



/**
 * ============================================================================
 * DOCUMENTS CRUD OPERATIONS
 * ============================================================================
 */

/**
 * Retrieve all documents with metadata
 * @returns {Promise<Array>} Array of document objects
 */
export const getDocuments = async () => {
  const response = await makeRequest(`${API_BASE_URL}/documents`)
  const data = await parseJSON(response)
  return data.documents || []
}

/**
 * Update document display name
 * @param {string} documentId - Document identifier
 * @param {string} displayName - New display name
 * @returns {Promise<Object>} Updated document object
 */
export const updateDocument = async (documentId, displayName) => {
  const params = new URLSearchParams()
  if (displayName) params.append('display_name', displayName)

  const response = await makeRequest(
    `${API_BASE_URL}/documents/${documentId}?${params.toString()}`,
    { method: 'PUT' }
  )
  return await parseJSON(response)
}

/**
 * Delete document and associated data
 * @param {string} documentId - Document identifier
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteDocument = async (documentId) => {
  const response = await makeRequest(
    `${API_BASE_URL}/documents/${documentId}`,
    { method: 'DELETE' }
  )
  return await parseJSON(response)
}



/**
 * ============================================================================
 * DOCUMENT INGESTION
 * ============================================================================
 */

/**
 * Upload and ingest document files with progress tracking
 * @param {string} documentId - Identifier for document batch
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise<Object>} Ingestion response with vector store ID
 */
export const ingestDocument = async (documentId, files, onProgress) => {
  const formData = new FormData()
  formData.append('document_id', documentId)
  files.forEach((file) => formData.append('files', file))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(percentComplete)
        }
      })
    }

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        // eslint-disable-next-line no-unused-vars
        } catch (_e) {
          reject(new Error('Failed to parse ingestion response'))
        }
      } else {
        let errorMsg = `Upload failed with status ${xhr.status}`
        try {
          const errorData = JSON.parse(xhr.responseText)
          errorMsg = errorData.detail || errorMsg
        // eslint-disable-next-line no-unused-vars
        } catch (_e) {
          // Use default error message
        }
        reject(new Error(errorMsg))
      }
    })

    // Handle upload errors
    xhr.addEventListener('error', () => reject(new Error('Upload network error')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled by user')))

    xhr.open('POST', `${API_BASE_URL}/ingest`)
    xhr.send(formData)
  })
}



/**
 * ============================================================================
 * QUERY / Q&A OPERATIONS
 * ============================================================================
 */

/**
 * Query document using RAG with streaming response
 * Supports multi-turn conversations via session_id
 * 
 * @param {string} question - User question/query
 * @param {string} vectorStoreId - Vector store identifier for retrieval
 * @param {string} [sessionId] - Optional session ID for conversation context
 * @returns {Promise<ReadableStreamDefaultReader>} Streaming response reader
 */
export const queryDocument = async (question, vectorStoreId, sessionId) => {
  // Pass vector store ID as-is (ChromaDB collection name, e.g. doc_my_document)
  const params = new URLSearchParams()
  params.append('question', question)
  params.append('vector_store_id', vectorStoreId)
  if (sessionId) params.append('session_id', sessionId)

  const url = `${API_BASE_URL}/query?${params.toString()}`
  
  const response = await makeRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!response.body) {
    throw new Error('Streaming not supported by server')
  }

  return response.body.getReader()
}



/**
 * ============================================================================
 * CHAT HISTORY & SESSION MANAGEMENT
 * ============================================================================
 */

/**
 * Search chat messages with optional filters
 * Combines keyword search with date/document/session filtering
 * 
 * @param {Object} filters - Search filters
 * @param {string} [filters.keyword] - Text search in questions/answers
 * @param {string} [filters.documentId] - Filter by document
 * @param {string} [filters.sessionId] - Filter by session
 * @param {number} [filters.days] - Filter last N days
 * @returns {Promise<Object>} Search results with metadata
 */
export const searchChats = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.keyword) params.append('keyword', filters.keyword)
  if (filters.documentId) params.append('document_id', filters.documentId)
  if (filters.sessionId) params.append('session_id', filters.sessionId)
  if (filters.days) params.append('days', filters.days)

  const response = await makeRequest(`${API_BASE_URL}/chats?${params.toString()}`)
  return await parseJSON(response)
}

/**
 * Retrieve complete chat history for a document session
 * @param {string} documentId - Document identifier
 * @param {string} [sessionId] - Optional specific session filter
 * @returns {Promise<Object>} Chat history with messages and metadata
 */
export const getChatHistory = async (documentId, sessionId) => {
  let url = `${API_BASE_URL}/chats/document/${documentId}`
  if (sessionId) {
    url += `?session_id=${sessionId}`
  }

  const response = await makeRequest(url)
  return await parseJSON(response)
}

/**
 * Delete individual chat message
 * @param {string} messageId - Message identifier
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteChatMessage = async (messageId) => {
  const response = await makeRequest(
    `${API_BASE_URL}/chats/${messageId}`,
    { method: 'DELETE' }
  )
  return await parseJSON(response)
}

/**
 * Delete entire chat session and all associated messages
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} Deletion confirmation with count
 */
export const deleteChatSession = async (sessionId) => {
  const response = await makeRequest(
    `${API_BASE_URL}/chats/session/${sessionId}`,
    { method: 'DELETE' }
  )
  return await parseJSON(response)
}

/**
 * Update a chat message (backend: PUT /chats/{message_id})
 * @param {string} messageId - Backend chat message ID (UUID)
 * @param {Object} data - Update data (answer, keywords, tags)
 * @returns {Promise<Object>} Updated message object
 */
export const updateChatMessage = async (messageId, data) => {
  const body = {}
  if (data.answer != null) body.answer = data.answer
  if (data.keywords != null) body.keywords = data.keywords
  if (data.tags != null) body.tags = data.tags

  const response = await makeRequest(
    `${API_BASE_URL}/chats/${messageId}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  )
  return await parseJSON(response)
}
