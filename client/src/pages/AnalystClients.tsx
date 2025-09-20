import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  lastAnalysis?: string
  totalAnalyses?: number
  avgScore?: number
}

interface RunningAnalysis {
  [clientId: string]: boolean
}

export default function AnalystClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'score' | 'analyses'>('created')
  const [runningAnalyses, setRunningAnalyses] = useState<RunningAnalysis>({})

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/analyst/clients')
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async (client: Client) => {
    try {
      setRunningAnalyses(prev => ({ ...prev, [client.id]: true }))

      const response = await axios.post('http://localhost:3001/api/analysis', {
        url: client.websiteUrl,
        clientId: client.id
      })

      // Refresh clients to update analysis count
      await fetchClients()

      alert(`Analysis started for ${client.companyName}! Analysis ID: ${response.data.analysisId}`)
    } catch (error) {
      console.error('Error running analysis:', error)
      alert('Failed to start analysis. Please try again.')
    } finally {
      setRunningAnalyses(prev => ({ ...prev, [client.id]: false }))
    }
  }

  const filteredAndSortedClients = clients
    .filter(client => 
      client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.websiteUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.targetQuestion && client.targetQuestion.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.companyName.localeCompare(b.companyName)
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'score':
          return (b.avgScore || 0) - (a.avgScore || 0)
        case 'analyses':
          return (b.totalAnalyses || 0) - (a.totalAnalyses || 0)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="mt-2 text-gray-600">
            Manage all SequelAEO clients with backdoor access to their dashboards
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search clients by name, website, or target question..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created">Sort by Created Date</option>
                <option value="name">Sort by Company Name</option>
                <option value="score">Sort by Avg Score</option>
                <option value="analyses">Sort by Total Analyses</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
            <div className="text-gray-600">Total Clients</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-green-600">
              {clients.reduce((sum, client) => sum + (client.totalAnalyses || 0), 0)}
            </div>
            <div className="text-gray-600">Total Analyses</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-purple-600">
              {clients.filter(c => c.avgScore && c.avgScore >= 80).length}
            </div>
            <div className="text-gray-600">High Performers (80+)</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-orange-600">
              {clients.reduce((sum, client) => sum + client.apiCredits, 0)}
            </div>
            <div className="text-gray-600">Total API Credits</div>
          </div>
        </div>

        {/* Client List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Clients ({filteredAndSortedClients.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredAndSortedClients.map((client) => (
              <div key={client.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {client.companyName}
                        </h3>
                        <p className="text-gray-600">{client.websiteUrl}</p>
                        {client.targetQuestion && (
                          <p className="text-sm text-blue-600 mt-1">
                            Target: "{client.targetQuestion}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                      <span>PIN: {client.pin}</span>
                      <span>Credits: {client.apiCredits}</span>
                      {client.totalAnalyses && (
                        <span>Analyses: {client.totalAnalyses}</span>
                      )}
                      {client.avgScore && (
                        <span className={`font-medium ${
                          client.avgScore >= 80 ? 'text-green-600' : 
                          client.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          Avg Score: {client.avgScore}
                        </span>
                      )}
                      <span>Created: {new Date(client.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => runAnalysis(client)}
                      disabled={runningAnalyses[client.id]}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        runningAnalyses[client.id]
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {runningAnalyses[client.id] ? 'Running...' : 'Run Analysis'}
                    </button>
                    <Link
                      to={`/analyst/client/${client.id}/dashboard`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={`/analyst/client/${client.id}/llm-rankings`}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      LLM Rankings
                    </Link>
                    <Link
                      to={`/analyst/client/${client.id}/edit`}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredAndSortedClients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No clients found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
