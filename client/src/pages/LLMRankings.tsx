import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

interface Client {
  id: string
  clientId: string
  companyName: string
  websiteUrl: string
  targetQuestion?: string
}

interface LLMRanking {
  id: string
  llmProvider: string
  question: string
  ranking: number
  mentioned: boolean
  snippet: string
  timestamp: string
  score: number
}

interface LLMTest {
  id: string
  question: string
  timestamp: string
  results: LLMRanking[]
}

export default function LLMRankings() {
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [rankings, setRankings] = useState<LLMTest[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')

  const llmProviders = [
    { name: 'ChatGPT', color: 'bg-green-500' },
    { name: 'Claude', color: 'bg-orange-500' },
    { name: 'Gemini', color: 'bg-blue-500' },
    { name: 'Perplexity', color: 'bg-purple-500' },
    { name: 'Bing Copilot', color: 'bg-cyan-500' }
  ]

  useEffect(() => {
    if (clientId) {
      fetchClientData()
      fetchRankings()
    }
  }, [clientId])

  const fetchClientData = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/analyst/clients/${clientId}`)
      setClient(response.data)
      setCustomQuestion(response.data.targetQuestion || '')
    } catch (error) {
      console.error('Error fetching client:', error)
    }
  }

  const fetchRankings = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/analyst/clients/${clientId}/llm-rankings`)
      setRankings(response.data)
    } catch (error) {
      console.error('Error fetching rankings:', error)
    } finally {
      setLoading(false)
    }
  }

  const runLLMTest = async (question?: string) => {
    if (!client) return
    
    setTesting(true)
    try {
      const testQuestion = question || customQuestion || client.targetQuestion
      if (!testQuestion) {
        alert('Please provide a question to test')
        return
      }

      await axios.post(`http://localhost:3001/api/analyst/clients/${clientId}/llm-test`, {
        question: testQuestion,
        websiteUrl: client.websiteUrl,
        companyName: client.companyName
      })
      
      // Refresh rankings
      await fetchRankings()
    } catch (error) {
      console.error('Error running LLM test:', error)
    } finally {
      setTesting(false)
    }
  }

  const getLatestRankings = () => {
    if (rankings.length === 0) return []
    return rankings[0].results
  }

  const getRankingTrend = (provider: string) => {
    if (rankings.length < 2) return 'neutral'
    
    const latest = rankings[0].results.find(r => r.llmProvider === provider)
    const previous = rankings[1].results.find(r => r.llmProvider === provider)
    
    if (!latest || !previous) return 'neutral'
    
    if (latest.ranking < previous.ranking) return 'up'
    if (latest.ranking > previous.ranking) return 'down'
    return 'neutral'
  }

  const getAverageRanking = () => {
    const latest = getLatestRankings()
    if (latest.length === 0) return 0
    
    const mentionedRankings = latest.filter(r => r.mentioned).map(r => r.ranking)
    if (mentionedRankings.length === 0) return 0
    
    return Math.round(mentionedRankings.reduce((a, b) => a + b, 0) / mentionedRankings.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading LLM rankings...</p>
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

  const latestRankings = getLatestRankings()
  const avgRanking = getAverageRanking()
  const mentionRate = latestRankings.length > 0 ? 
    (latestRankings.filter(r => r.mentioned).length / latestRankings.length * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link to={`/analyst/client/${clientId}/dashboard`} className="text-blue-600 hover:underline mb-2 inline-block">
            ← Back to {client.companyName} Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">LLM Rankings</h1>
          <p className="mt-2 text-gray-600">
            Track how {client.companyName} ranks across different AI language models
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Run LLM Test</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Enter question to test (e.g., Who are the best digital consultants in Los Angeles?)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => runLLMTest()}
              disabled={testing || !customQuestion}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {testing ? 'Testing...' : 'Run Test'}
            </button>
          </div>
          {client.targetQuestion && (
            <div className="mt-3">
              <p className="text-sm text-gray-600">
                Default question: "{client.targetQuestion}"
                <button
                  onClick={() => runLLMTest(client.targetQuestion)}
                  disabled={testing}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Test this
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-blue-600">{avgRanking || 'N/A'}</div>
            <div className="text-gray-600">Average Ranking</div>
            <div className="text-sm text-gray-500 mt-1">When mentioned</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-green-600">{mentionRate.toFixed(1)}%</div>
            <div className="text-gray-600">Mention Rate</div>
            <div className="text-sm text-gray-500 mt-1">Across all LLMs</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-2xl font-bold text-purple-600">{rankings.length}</div>
            <div className="text-gray-600">Total Tests</div>
            <div className="text-sm text-gray-500 mt-1">Historical data</div>
          </div>
        </div>

        {/* Latest Rankings */}
        {latestRankings.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Latest Rankings</h2>
              <p className="text-gray-600">
                Question: "{rankings[0].question}"
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {llmProviders.map((provider) => {
                  const ranking = latestRankings.find(r => r.llmProvider === provider.name)
                  const trend = getRankingTrend(provider.name)
                  
                  return (
                    <div key={provider.name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${provider.color}`}></div>
                          <span className="font-medium">{provider.name}</span>
                        </div>
                        {trend !== 'neutral' && (
                          <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {trend === 'up' ? '↗' : '↘'}
                          </span>
                        )}
                      </div>
                      
                      {ranking && ranking.mentioned ? (
                        <div>
                          <div className="text-2xl font-bold text-gray-900">#{ranking.ranking}</div>
                          <div className="text-sm text-gray-600 mt-2">{ranking.snippet}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            Score: {ranking.score}/100
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <div className="text-lg">Not mentioned</div>
                          <div className="text-sm">Company not found in results</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Historical Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Test History</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {rankings.length > 0 ? (
              rankings.map((test, index) => (
                <div key={test.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">"{test.question}"</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(test.timestamp).toLocaleString()}
                        {index === 0 && <span className="ml-2 text-blue-600">(Latest)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {llmProviders.map((provider) => {
                      const ranking = test.results.find(r => r.llmProvider === provider.name)
                      return (
                        <div key={provider.name} className="text-center">
                          <div className={`w-2 h-2 rounded-full ${provider.color} mx-auto mb-1`}></div>
                          <div className="text-xs text-gray-600">{provider.name}</div>
                          <div className="font-medium">
                            {ranking && ranking.mentioned ? `#${ranking.ranking}` : 'N/A'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No LLM tests have been run yet. Click "Run Test" to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
