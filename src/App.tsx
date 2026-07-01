import { Route, Routes } from 'react-router-dom'
import DiagnosisPage from './pages/DiagnosisPage'
import ResultPage from './pages/ResultPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<DiagnosisPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  )
}

export default App
