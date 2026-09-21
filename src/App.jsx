import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PelangganPage from './pages/Pelanggan'
import TransaksiPage from './pages/Transaksi' // <-- INI YANG TADI LUPA DI-IMPORT!
import KeuanganPage from './pages/Keuangan'
import StokPage from './pages/Stok'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import TeamPage from './pages/Team'
import Layout from './components/Layout'

function ProtectedRoute({ session, children }) {
  return session ? children : <Navigate to="/login" replace />
}

function PublicOnlyRoute({ session, children }) {
  return session ? <Navigate to="/" replace /> : children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <p style={{ padding: '20px' }}>Loading...</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute session={session}><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute session={session}><Register /></PublicOnlyRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute session={session}><Onboarding /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute session={session}><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/pelanggan" element={<ProtectedRoute session={session}><Layout><PelangganPage /></Layout></ProtectedRoute>} />
        <Route path="/transaksi" element={<ProtectedRoute session={session}><Layout><TransaksiPage /></Layout></ProtectedRoute>} />
        <Route path="/keuangan" element={<ProtectedRoute session={session}><Layout><KeuanganPage /></Layout></ProtectedRoute>} />
        <Route path="/stok" element={<ProtectedRoute session={session}><Layout><StokPage /></Layout></ProtectedRoute>} />
        <Route path="/tim" element={<ProtectedRoute session={session}><Layout><TeamPage /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}