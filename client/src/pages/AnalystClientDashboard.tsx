import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

interface Client {
  id: string
  clientId: string
  companyName: string
  websiteUrl: string
  contactEmail?: string
  targetQuestion?: string
  pin: string
  apiCredits: number
  createdAt: string
}

interface Analysis {
  id: string
  url: string
  title: string
  overallScore: number
  status: string
  createdAt: string
  updatedAt: string
}

export default function AnalystClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Client>>({})
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [customUrl, setCustomUrl] = useState('')

  useEffect(() => {
    if (clientId) {
      fetchClientData()
      fetchAnalyses()
    }
  }, [clientId])

  useEffect(() => {
    if (client) {
      setCustomUrl(client.websiteUrl)
    }
  }, [clientId])

  const fetchClientData = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/analyst/clients/${clientId}`)
      setClient(response.data)
      setEditData(response.data)
    } catch (error) {
      console.error('Error fetching client:', error)
    }
  }

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/analyst/clients/${clientId}/analyses`)
      setAnalyses(response.data)
    } catch (error) {
      console.error('Error fetching analyses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    try {
      await axios.put(`http://localhost:3001/api/analyst/clients/${clientId}`, editData)
      setClient({ ...client!, ...editData })
      setEditMode(false)
    } catch (error) {
      console.error('Error updating client:', error)
    }
  }

  const handleRunAnalysis = async () => {
    if (!client || runningAnalysis) return

    const urlToAnalyze = customUrl || client.websiteUrl
    if (!urlToAnalyze) {
      alert('Please enter a URL to analyze')
      return
    }

    setRunningAnalysis(true)
    try {
      console.log('Starting analysis for:', client.companyName, urlToAnalyze)

      const response = await axios.post('http://localhost:3001/api/analysis', {
        url: urlToAnalyze,
        clientId: client.clientId
      })

      console.log('Analysis response:', response.data)

      // Refresh analyses list
      await fetchAnalyses()

      // Navigate to analysis results in new tab
      const analysisId = response.data.analysisId || response.data.id
      if (analysisId) {
        window.open(`/analyst/analysis/${analysisId}`, '_blank')
      } else {
        console.error('No analysis ID returned:', response.data)
      }
    } catch (error) {
      console.error('Error running analysis:', error)
      alert('Failed to start analysis. Please try again.')
    } finally {
      setRunningAnalysis(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client dashboard...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Client not found</p>
          <Link to="/analyst/clients" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/analyst/clients" className="text-blue-600 hover:underline mb-2 inline-block">
                ← Back to Clients
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{client.companyName}</h1>
              <p className="mt-2 text-gray-600">Analyst Dashboard - Full Access</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditMode(!editMode)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {editMode ? 'Cancel Edit' : 'Edit Client'}
              </button>
              <Link
                to={`/analyst/client/${clientId}/llm-rankings`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                LLM Rankings
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Analysis</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">URL to Analyze</label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Enter URL to analyze..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRunAnalysis}
                disabled={runningAnalysis || !customUrl}
                className={`px-6 py-2 text-white rounded-lg transition-colors ${
                  runningAnalysis || !customUrl
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {runningAnalysis ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>
          
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={editData.companyName || ''}
                  onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                <input
                  type="url"
                  value={editData.websiteUrl || ''}
                  onChange={(e) => setEditData({ ...editData, websiteUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={editData.contactEmail || ''}
                  onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Credits</label>
                <input
                  type="number"
                  value={editData.apiCredits || 0}
                  onChange={(e) => setEditData({ ...editData, apiCredits: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Question for LLM Ranking</label>
                <input
                  type="text"
                  value={editData.targetQuestion || ''}
                  onChange={(e) => setEditData({ ...editData, targetQuestion: e.target.value })}
                  placeholder="e.g., Who are the best digital consultants in Los Angeles?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={handleSaveChanges}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-500">Website</div>
                <div className="font-medium">
                  <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {client.websiteUrl}
                  </a>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Contact Email</div>
                <div className="font-medium">{client.contactEmail || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">API Credits</div>
                <div className="font-medium">{client.apiCredits}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Client PIN</div>
                <div className="font-medium font-mono">{client.pin}</div>
              </div>
              {client.targetQuestion && (
                <div className="md:col-span-2 lg:col-span-4">
                  <div className="text-sm text-gray-500">Target Question for LLM Ranking</div>
                  <div className="font-medium text-blue-600">"{client.targetQuestion}"</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Analyses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Analysis History</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {analyses.length > 0 ? (
              analyses.map((analysis) => (
                <div key={analysis.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{analysis.title || analysis.url}</h3>
                      <p className="text-gray-600">{analysis.url}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          analysis.status === 'completed' ? 'bg-green-100 text-green-800' :
                          analysis.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {analysis.status}
                        </span>
                        <span>Score: {analysis.overallScore}</span>
                        <span>Created: {new Date(analysis.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Link
                      to={`/analyst/analysis/${analysis.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Results
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No analyses found for this client.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
