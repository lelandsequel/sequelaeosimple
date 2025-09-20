import React, { createContext, useContext, useState, useEffect } from 'react'

interface Client {
  clientId: string
  companyName: string
  websiteUrl: string
  apiCredits: number
}

interface AuthContextType {
  client: Client | null
  isAuthenticated: boolean
  login: (client: Client) => void
  logout: () => void
  updateCredits: (credits: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [client, setClient] = useState<Client | null>(null)

  // Load client from localStorage on mount
  useEffect(() => {
    const savedClient = localStorage.getItem('aeo-client')
    if (savedClient) {
      try {
        setClient(JSON.parse(savedClient))
      } catch (error) {
        console.error('Failed to parse saved client:', error)
        localStorage.removeItem('aeo-client')
      }
    }
  }, [])

  const login = (clientData: Client) => {
    setClient(clientData)
    localStorage.setItem('aeo-client', JSON.stringify(clientData))
  }

  const logout = () => {
    setClient(null)
    localStorage.removeItem('aeo-client')
  }

  const updateCredits = (credits: number) => {
    if (client) {
      const updatedClient = { ...client, apiCredits: credits }
      setClient(updatedClient)
      localStorage.setItem('aeo-client', JSON.stringify(updatedClient))
    }
  }

  const value: AuthContextType = {
    client,
    isAuthenticated: !!client,
    login,
    logout,
    updateCredits,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
