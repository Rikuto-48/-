import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DiagnosisPage from './pages/DiagnosisPage'
import ResultPage from './pages/ResultPage'
import LoginPage from './pages/admin/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import LeadsPage from './pages/admin/LeadsPage'
import CalendarPage from './pages/admin/CalendarPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import MessageQueuePage from './pages/admin/MessageQueuePage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/diagnosis" element={<DiagnosisPage />} />
      <Route path="/diagnosis/result" element={<ResultPage />} />

      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/leads" replace />} />
          <Route path="/admin/leads" element={<LeadsPage />} />
          <Route path="/admin/calendar" element={<CalendarPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/messages" element={<MessageQueuePage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
