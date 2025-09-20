import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  BarChart3, 
  Settings, 
  LogOut, 
  Search, 
  Home,
  User,
  CreditCard
} from 'lucide-react'

export default function Layout() {
  const { client, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/client/login')
  }

  const isAnalyst = location.pathname.startsWith('/analyst')
  const isClient = location.pathname.startsWith('/client')

  const navigation = isAnalyst ? [
    { name: 'Analysis Portal', href: '/analyst', icon: Search },
  ] : [
    { name: 'Dashboard', href: '/client/dashboard', icon: Home },
    { name: 'Analysis Portal', href: '/client/portal', icon: Search },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-primary-600">
                  SequelAEO
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && client && (
                <>
                  {/* Credits display for clients */}
                  {isClient && (
                    <div className="flex items-center text-sm text-gray-600">
                      <CreditCard className="w-4 h-4 mr-1" />
                      <span>{client.apiCredits} credits</span>
                    </div>
                  )}

                  {/* User menu */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {client.companyName}
                      </span>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
