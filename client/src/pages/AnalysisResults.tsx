import { useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { analysisApi } from '../services/api'
import { Loader2, AlertCircle } from 'lucide-react'

export default function AnalysisResults() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery(
    ['analysis', id],
    () => analysisApi.get(id!),
    {
      enabled: !!id,
      select: (response) => response.data,
      refetchInterval: (data) => {
        // Refetch if analysis is still in progress
        return data?.analysis?.status === 'in_progress' ? 5000 : false
      },
    }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-2 text-lg">Loading analysis...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Analysis Not Found
        </h2>
        <p className="text-gray-600">
          The analysis you're looking for doesn't exist or has been removed.
        </p>
      </div>
    )
  }

  const { analysis, fixes } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Analysis Results
        </h1>
        <p className="text-gray-600">{analysis.url}</p>
      </div>

      {/* Overall Score */}
      <div className="card">
        <div className="card-body">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">
              {analysis.overallScore}
            </div>
            <p className="text-lg text-gray-600">Overall AEO Score</p>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">
            Category Scores
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysis.categoryScores || {}).map(([category, score]) => (
              <div key={category} className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-primary-600 mb-1">
                  {score as number}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues */}
      {analysis.issues && analysis.issues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Issues Found ({analysis.issues.length})
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {analysis.issues.map((issue: string, index: number) => (
                <div key={index} className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-danger-500 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">{issue}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Recommendations ({analysis.recommendations.length})
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {analysis.recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start">
                  <div className="w-5 h-5 bg-success-500 rounded-full mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <p className="text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fixes */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">
            Generated Fixes ({fixes?.length || 0})
          </h2>
        </div>
        <div className="card-body">
          {fixes?.length > 0 ? (
            <div className="space-y-4">
              {fixes.map((fix: any) => (
                <div key={fix.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {fix.title}
                  </h3>
                  <p className="text-gray-600 mb-3">{fix.description}</p>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
                    <pre>{fix.fixCode}</pre>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                    <span>AI Model: {fix.aiModel}</span>
                    <span>Tokens: {fix.tokensUsed} | Cost: ${fix.cost?.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-6">
              No fixes generated yet. Analysis may still be in progress.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
