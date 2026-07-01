import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import SectionsPage from './pages/SectionsPage'
import SectionDetailPage from './pages/SectionDetailPage'
import PlansPage from './pages/PlansPage'
import ThresholdsPage from './pages/ThresholdsPage'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <Routes>
      <Route path="/sections/:sectionId/report" element={<ReportPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sections" element={<SectionsPage />} />
        <Route path="/sections/:sectionId" element={<SectionDetailPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/thresholds" element={<ThresholdsPage />} />
      </Route>
    </Routes>
  )
}

export default App
