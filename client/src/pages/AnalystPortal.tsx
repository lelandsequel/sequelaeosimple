import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from 'react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { 
  Search, 
  Globe, 
  Zap, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { clientApi, analysisApi } from '../services/api'

const createClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  websiteUrl: z.string().url('Please enter a valid URL'),
  contactEmail: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  targetQuestion: z.string().optional(),
})

const analyzeSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  quick: z.boolean().optional(),
})

type CreateClientForm = z.infer<typeof createClientSchema>
type AnalyzeForm = z.infer<typeof analyzeSchema>

export default function AnalystPortal() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'create' | 'analyze'>('create')
  const [createdClient, setCreatedClient] = useState<any>(null)

  // Create client form
  const createForm = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
  })

  // Analysis form
  const analyzeForm = useForm<AnalyzeForm>({
    resolver: zodResolver(analyzeSchema),
    defaultValues: {
      quick: false,
    },
  })

  // Create client mutation
  const createClientMutation = useMutation(clientApi.create, {
    onSuccess: (response) => {
      const clientData = response.data
      setCreatedClient(clientData)
      toast.success('Client created successfully!')
      createForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create client')
    },
  })

  // Analysis mutation
  const analysisMutation = useMutation(analysisApi.analyze, {
    onSuccess: (response) => {
      const { analysisId } = response.data
      toast.success('Analysis started successfully!')
      navigate(`/analyst/analysis/${analysisId}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start analysis')
    },
  })

  const onCreateClient = (data: CreateClientForm) => {
    createClientMutation.mutate(data)
  }

  const onAnalyze = (data: AnalyzeForm) => {
    if (!createdClient) {
      toast.error('Please create a client first')
      return
    }

    analysisMutation.mutate({
      url: data.url,
      clientId: createdClient.clientId,
      options: {
        quick: data.quick,
      },
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Analyst Portal
            </h1>
            <p className="text-lg text-gray-600">
              Create client accounts and perform comprehensive AEO analysis
            </p>
          </div>
          <Link
            to="/analyst/clients"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Clients
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Client
            </button>
            <button
              onClick={() => setActiveTab('analyze')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analyze'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Run Analysis
            </button>
          </nav>
        </div>
      </div>

      {/* Create Client Tab */}
      {activeTab === 'create' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Client Account
            </h2>
            <p className="text-gray-600 mt-1">
              Generate a new client account with secure PIN authentication
            </p>
          </div>
          <div className="card-body">
            <form onSubmit={createForm.handleSubmit(onCreateClient)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  {...createForm.register('companyName')}
                  className="input"
                  placeholder="Enter company name"
                />
                {createForm.formState.errors.companyName && (
                  <p className="text-danger-600 text-sm mt-1">
                    {createForm.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  {...createForm.register('websiteUrl')}
                  className="input"
                  placeholder="https://example.com"
                />
                {createForm.formState.errors.websiteUrl && (
                  <p className="text-danger-600 text-sm mt-1">
                    {createForm.formState.errors.websiteUrl.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email (Optional)
                </label>
                <input
                  {...createForm.register('contactEmail')}
                  type="email"
                  className="input"
                  placeholder="contact@example.com"
                />
                {createForm.formState.errors.contactEmail && (
                  <p className="text-danger-600 text-sm mt-1">
                    {createForm.formState.errors.contactEmail.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Question for LLM Ranking (Optional)
                </label>
                <input
                  {...createForm.register('targetQuestion')}
                  type="text"
                  className="input"
                  placeholder="e.g., Who are the best digital consultants in Los Angeles?"
                />
                <p className="text-gray-500 text-sm mt-1">
                  This question will be used to track how the client ranks across different AI language models
                </p>
                {createForm.formState.errors.targetQuestion && (
                  <p className="text-danger-600 text-sm mt-1">
                    {createForm.formState.errors.targetQuestion.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={createClientMutation.isLoading}
                className="btn btn-primary w-full"
              >
                {createClientMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Client...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Client Account
                  </>
                )}
              </button>
            </form>

            {/* Created Client Display */}
            {createdClient && (
              <div className="mt-6 p-4 bg-success-50 border border-success-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <CheckCircle className="w-5 h-5 text-success-600 mr-2" />
                  <h3 className="font-semibold text-success-800">
                    Client Created Successfully!
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Company:</strong> {createdClient.companyName}</p>
                  <p><strong>Client ID:</strong> {createdClient.clientId}</p>
                  <p><strong>PIN:</strong> <code className="bg-success-100 px-2 py-1 rounded">{createdClient.pin}</code></p>
                  <p><strong>API Credits:</strong> {createdClient.apiCredits}</p>
                </div>
                <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-warning-600 mr-2 mt-0.5" />
                    <p className="text-warning-800 text-sm">
                      <strong>Important:</strong> Save the PIN securely. It cannot be recovered and is required for client login.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analyze' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">
              Run AEO Analysis
            </h2>
            <p className="text-gray-600 mt-1">
              Perform comprehensive Answer Engine Optimization analysis
            </p>
          </div>
          <div className="card-body">
            {!createdClient ? (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Create a Client First
                </h3>
                <p className="text-gray-600 mb-4">
                  You need to create a client account before running analysis
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn btn-primary"
                >
                  Go to Create Client
                </button>
              </div>
            ) : (
              <form onSubmit={analyzeForm.handleSubmit(onAnalyze)} className="space-y-6">
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <h3 className="font-medium text-primary-900 mb-2">
                    Analyzing for: {createdClient.companyName}
                  </h3>
                  <p className="text-primary-700 text-sm">
                    Client ID: {createdClient.clientId}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL to Analyze
                  </label>
                  <input
                    {...analyzeForm.register('url')}
                    className="input"
                    placeholder="https://example.com/page-to-analyze"
                  />
                  {analyzeForm.formState.errors.url && (
                    <p className="text-danger-600 text-sm mt-1">
                      {analyzeForm.formState.errors.url.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    {...analyzeForm.register('quick')}
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Quick analysis (faster, basic checks only)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={analysisMutation.isLoading}
                  className="btn btn-primary w-full"
                >
                  {analysisMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Analysis...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Start AEO Analysis
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
