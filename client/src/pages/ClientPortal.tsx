import { useState } from 'react'
import { Search, Plus } from 'lucide-react'

export default function ClientPortal() {
  const [url, setUrl] = useState('')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Analysis Portal
        </h1>
        <p className="text-lg text-gray-600">
          Analyze your website for Answer Engine Optimization
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">
            New Analysis
          </h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL to Analyze
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input"
                placeholder="https://example.com/page-to-analyze"
              />
            </div>
            <button className="btn btn-primary">
              <Search className="w-4 h-4 mr-2" />
              Start Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
