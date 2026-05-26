export default function ProcessingSteps({ steps = [] }) {
  const defaultSteps = [
    { id: 1, label: 'Retrieving relevant chunks', status: 'pending' },
    { id: 2, label: 'Extracting page content', status: 'pending' },
    { id: 3, label: 'Generating answer', status: 'pending' },
    { id: 4, label: 'Extracting source sentences', status: 'pending' },
    { id: 5, label: 'Finalizing results', status: 'pending' },
  ]

  const displaySteps = steps.length > 0 ? steps : defaultSteps

  return (
    <div className="bg-white rounded-xl card-shadow overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-cyan-600 p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Processing Steps
        </h3>
      </div>

      {/* Steps Timeline */}
      <div className="p-6 space-y-4">
        {displaySteps.map((step, index) => {
          const isLastStep = index === displaySteps.length - 1
          return (
            <>
              <div key={step.id} className="flex items-start gap-4">
                {/* Step Number / Status Icon */}
                <div className="shrink-0">
              {step.status === 'completed' ? (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500 text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : step.status === 'in-progress' ? (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-linear-to-r from-blue-500 to-cyan-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-transparent border-t-white"></div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-300 text-slate-600">
                  <span className="text-xs font-semibold">{index + 1}</span>
                </div>
              )}
            </div>

            {/* Step Content */}
            <div className="grow pt-1">
              <p className={`text-sm font-semibold ${
                step.status === 'completed' ? 'text-green-700' :
                step.status === 'in-progress' ? 'text-blue-700' :
                'text-slate-600'
              }`}>
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs text-slate-600 mt-1">{step.detail}</p>
              )}
            </div>

            {/* Status Badge */}
            {step.status === 'in-progress' && (
              <div className="shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <span className="animate-pulse">●</span>
                  In progress
                </span>
              </div>
            )}
            {step.status === 'completed' && (
              <div className="shrink-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  ✓ Done
                </span>
              </div>
            )}
          </div>

          {/* Connector Line */}
          {!isLastStep && (
            <div className="flex ml-4 pl-0">
              <div className="w-0.5 h-4 bg-slate-300"></div>
            </div>
          )}
            </>
          )
        })}
      </div>
    </div>
  )
}
