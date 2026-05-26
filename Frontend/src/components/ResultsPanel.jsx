export default function ResultsPanel({ results }) {
  if (!results) {
    return null
  }
  
  const { highlighted_chunks = [], filters_applied = {} } = results

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Highlighted Chunks */}
      {highlighted_chunks && highlighted_chunks.length > 0 && (
        <div className="bg-white rounded-xl card-shadow overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Source Passages
            </h3>
            <p className="text-blue-100 text-sm mt-1">{highlighted_chunks.length} supporting chunks</p>
          </div>

          {/* Chunks List */}
          <div className="divide-y divide-slate-200">
            {highlighted_chunks.map((chunk, index) => (
              <div
                key={index}
                className="p-6 hover:bg-blue-50 transition-colors duration-200 group"
              >
                {/* Chunk Number Badge */}
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-cyan-500 text-white font-semibold text-sm">
                      {index + 1}
                    </span>
                  </div>

                  {/* Chunk Content */}
                  <div className="grow min-w-0">
                    <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap break-word">
                      {chunk}
                    </p>

                    {/* Copy Button */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(chunk)
                      }}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Applied Info */}
      {filters_applied && Object.keys(filters_applied).length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Filters Applied</p>
          <div className="space-y-1">
            {filters_applied.sentence_level_matching && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Sentence-level chunk matching enabled
              </div>
            )}
            {filters_applied.evaluation_keywords && filters_applied.evaluation_keywords.length > 0 && (
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs text-slate-600">Evaluation keywords: <span className="font-medium">{filters_applied.evaluation_keywords.join(', ')}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
