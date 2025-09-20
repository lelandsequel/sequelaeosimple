import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import AnalystPortal from './pages/AnalystPortal'
import AnalystClients from './pages/AnalystClients'
import AnalystClientDashboard from './pages/AnalystClientDashboard'
import LLMRankings from './pages/LLMRankings'
import ClientPortal from './pages/ClientPortal'
import ClientLogin from './pages/ClientLogin'
import AnalysisResults from './pages/AnalysisResults'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/client/login" element={<ClientLogin />} />
        
        {/* Analyst portal */}
        <Route path="/analyst" element={<Layout />}>
          <Route index element={<AnalystPortal />} />
          <Route path="clients" element={<AnalystClients />} />
          <Route path="client/:clientId/dashboard" element={<AnalystClientDashboard />} />
          <Route path="client/:clientId/llm-rankings" element={<LLMRankings />} />
          <Route path="analysis/:id" element={<AnalysisResults />} />
        </Route>
        
        {/* Client portal */}
        <Route path="/client" element={<Layout />}>
          <Route index element={<Navigate to="/client/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="portal" element={<ClientPortal />} />
          <Route path="analysis/:id" element={<AnalysisResults />} />
        </Route>
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
