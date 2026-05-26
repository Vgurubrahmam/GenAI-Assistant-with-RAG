import { useState, useRef, forwardRef } from 'react'

const DocumentUpload = forwardRef(({ onUploadSuccess, isLoading: parentIsLoading }, ref) => {
  const [files, setFiles] = useState([])
  const [documentId, setDocumentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fileInputs, setFileInputs] = useState([{ id: 1 }]) // Multiple file input instances
  const fileInputRefs = useRef({})
  const fileInputRef = useRef(null) // Keep for backward compatibility

  // Expose the file input click method via ref
  if (ref) {
    ref.current = {
      click: () => fileInputRefs.current[fileInputs[0]?.id]?.click()
    }
  }

  const isAllowedFile = (file) => {
    if (!file) return false
    const typeOk = file.type === 'application/pdf' || file.type === 'text/plain'
    const extOk = /\.(pdf|txt)$/i.test(file.name || '')
    return typeOk || extOk
  }

  const handleFilesPicked = (e, inputId) => {
    const picked = Array.from(e.target.files || [])
    if (picked.length === 0) return

    const invalid = picked.find((f) => !isAllowedFile(f))
    if (invalid) {
      setError('Only PDF and TXT files are allowed')
      if (fileInputRefs.current[inputId]) fileInputRefs.current[inputId].value = ''
      return
    }

    setError('')
    setFiles((prevFiles) => [...prevFiles, ...picked])
  }

  const handleRemoveFile = (index) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next
    })
  }

  const handleAddFileInput = () => {
    const newId = Math.max(...fileInputs.map((f) => f.id), 0) + 1
    setFileInputs((prev) => [...prev, { id: newId }])
  }

  const handleRemoveFileInput = (inputId) => {
    setFileInputs((prev) => prev.filter((f) => f.id !== inputId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validFiles = files.filter(Boolean)
    if (validFiles.length === 0 || !documentId.trim()) {
      setError('Please select at least one file and enter document ID')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

try {
      // Call onUploadSuccess and wait for it to complete
      await onUploadSuccess({
        document_id: documentId,
        files: files,
      })
      
      // Clear file inputs and form state
      Object.values(fileInputRefs.current).forEach((input) => {
        if (input) input.value = ''
      })
      setFiles([])
      setFileInputs([{ id: 1 }])
      setDocumentId('')
      setSuccess(`${files.length} file(s) uploaded successfully!`)
      setTimeout(() => setSuccess(''), 3000)
} catch (err) {
setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
          </svg>
          Upload Documents
        </h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Document ID: user-provided name for this batch of files */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Document ID *</label>
          <input
            type="text"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="e.g., ml_book, research_paper_2024"
            disabled={loading || parentIsLoading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors disabled:bg-slate-100 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Name for this group of files (one vector store for all)</p>
        </div>

        {/* Files Input - Swagger Style with Add Button */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Files (PDF or TXT) *</label>
          
          {/* File Input Fields */}
          <div className="space-y-2">
            {fileInputs.map((input, idx) => (
              <div key={input.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[input.id]?.click()}
                  disabled={loading || parentIsLoading}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Choose file
                </button>
                <input
                  ref={(el) => {
                    fileInputRefs.current[input.id] = el
                  }}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(e) => handleFilesPicked(e, input.id)}
                  disabled={loading || parentIsLoading}
                  className="hidden"
                />
                <span className="text-sm text-slate-600 flex-1">
                  {files.length > idx ? `${files[idx]?.name}` : 'No file chosen'}
                </span>
                {fileInputs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFileInput(input.id)}
                    disabled={loading || parentIsLoading}
                    className="px-2 py-1.5 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                    aria-label="Remove file input"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add File Button */}
          <button
            type="button"
            onClick={handleAddFileInput}
            disabled={loading || parentIsLoading}
            className="mt-3 px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add file
          </button>

          {/* Selected Files Summary */}
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Selected files ({files.length}):
              </p>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                    <span className="text-sm text-slate-700 font-medium truncate flex-1">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      disabled={loading || parentIsLoading}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      aria-label="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3">Supported: PDF and TXT files (max 50MB each)</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={files.length === 0 || !documentId || loading || parentIsLoading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {loading || parentIsLoading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  )
})

DocumentUpload.displayName = 'DocumentUpload'

export default DocumentUpload

