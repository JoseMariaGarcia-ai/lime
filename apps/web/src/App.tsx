import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Login } from './pages/Login'
import { Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { WhatsApp } from './pages/WhatsApp'
import { Agenda } from './pages/Agenda'
import { Workflows } from './pages/Workflows'
import { Settings } from './pages/Settings'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
