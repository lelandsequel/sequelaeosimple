import { useQuery } from 'react-query'
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Target
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { dashboardApi } from '../services/api'

export default function Dashboard() {
  const { client } = useAuth()

  const { data: dashboardData, isLoading } = useQuery(
    ['dashboard', client?.clientId],
    () => dashboardApi.get(client!.clientId),
    {
      enabled: !!client?.clientId,
      select: (response) => response.data,
    }
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-8 w-64 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="shimmer h-4 w-20 rounded mb-2"></div>
                <div className="shimmer h-8 w-16 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Average Score',
      value: dashboardData?.averageScore || 0,
      icon: Target,
      color: 'primary',
    },
    {
      name: 'Total Fixes',
      value: dashboardData?.totalFixes || 0,
      icon: AlertTriangle,
      color: 'warning',
    },
    {
      name: 'Implemented',
      value: dashboardData?.implementedFixes || 0,
      icon: CheckCircle,
      color: 'success',
    },
    {
      name: 'Recent Analyses',
      value: dashboardData?.recentAnalyses?.length || 0,
      icon: BarChart3,
      color: 'primary',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {client?.companyName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Analyses
            </h2>
          </div>
          <div className="card-body">
            {dashboardData?.recentAnalyses?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentAnalyses.map((analysis: any) => (
                  <div key={analysis.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 truncate">
                        {analysis.url}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`badge ${
                        analysis.overall_score >= 80 ? 'badge-success' :
                        analysis.overall_score >= 60 ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {analysis.overall_score}
                      </span>
                      <span className={`badge ${
                        analysis.status === 'completed' ? 'badge-success' :
                        analysis.status === 'in_progress' ? 'badge-warning' :
                        analysis.status === 'failed' ? 'badge-danger' :
                        'badge-gray'
                      }`}>
                        {analysis.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No analyses yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Issues */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Issues
            </h2>
          </div>
          <div className="card-body">
            {dashboardData?.topIssues?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.topIssues.map((issue: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {issue.category.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {issue.fixCount} fixes needed
                      </p>
                    </div>
                    <span className={`badge ${
                      issue.severity === 'critical' ? 'badge-danger' :
                      issue.severity === 'high' ? 'badge-warning' :
                      'badge-gray'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-success-400 mx-auto mb-4" />
                <p className="text-gray-600">No issues found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
