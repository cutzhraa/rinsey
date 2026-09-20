import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PelangganPage from './pages/Pelanggan'
import Layout from './components/Layout'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({data})=> { setSession(data.session); setLoading(false) })
    supabase.auth.onAuthStateChange((_e, s)=> setSession(s))
  }, [])
  if(loading) return <p>Loading...</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={session ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/pelanggan" element={session ? <Layout><PelangganPage /></Layout> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}