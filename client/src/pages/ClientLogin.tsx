import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from 'react-query'
import toast from 'react-hot-toast'
import { Lock, User, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { clientApi } from '../services/api'

const loginSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  pin: z.string().length(6, 'PIN must be 6 digits'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function ClientLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation(clientApi.authenticate, {
    onSuccess: (response) => {
      const clientData = response.data
      login(clientData)
      toast.success('Login successful!')
      navigate('/client/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed')
    },
  })

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back to home */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>

        {/* Logo */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Client Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your AEO dashboard
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Client ID
              </label>
              <div className="mt-1 relative">
                <input
                  {...form.register('clientId')}
                  type="text"
                  className="input pl-10"
                  placeholder="Enter your client ID"
                />
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              {form.formState.errors.clientId && (
                <p className="text-danger-600 text-sm mt-1">
                  {form.formState.errors.clientId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                PIN
              </label>
              <div className="mt-1 relative">
                <input
                  {...form.register('pin')}
                  type="password"
                  maxLength={6}
                  className="input pl-10 font-mono tracking-wider"
                  placeholder="Enter your 6-digit PIN"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              {form.formState.errors.pin && (
                <p className="text-danger-600 text-sm mt-1">
                  {form.formState.errors.pin.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loginMutation.isLoading}
                className="btn btn-primary w-full"
              >
                {loginMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Need help?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/analyst"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Contact your analyst
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            How to get your credentials:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your Client ID and PIN are provided by your AEO analyst</li>
            <li>• The PIN is a secure 6-digit code for authentication</li>
            <li>• Contact your analyst if you've forgotten your credentials</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
