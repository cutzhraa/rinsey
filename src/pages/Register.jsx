import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async event => {
    event.preventDefault()
    if (password.length < 6) return alert('Password minimal 6 karakter.')

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return alert(error.message)

    if (data.session) {
      navigate('/onboarding')
    } else {
      alert('Akun berhasil dibuat. Cek email untuk verifikasi, lalu login.')
      navigate('/login')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', background: 'radial-gradient(circle at top left, #e0f2fe, #f0f9ff, #ffffff)' }}>
      <div style={{ background: 'white', padding: '36px', borderRadius: '20px', width: 'min(360px, 100%)', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/rinsey.jpg" alt="Rinsey" style={{ width: '58px', height: '58px', borderRadius: '18px', objectFit: 'cover' }} />
          <h2 style={{ margin: '12px 0 4px', fontWeight: '800', color: '#111827' }}>Buat Akun Rinsey</h2>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>Mulai kelola laundry kamu</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Email</label>
          <input type="email" value={email} onChange={event => setEmail(event.target.value)} required style={{ width: '100%', padding: '12px 14px', margin: '6px 0 16px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#111', boxSizing: 'border-box' }} />
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Password</label>
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength="6" required style={{ width: '100%', padding: '12px 14px', margin: '6px 0 24px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#111', boxSizing: 'border-box' }} />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: 'black', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Membuat akun...' : 'Daftar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', margin: '20px 0 0' }}>
          Sudah punya akun? <Link to="/login" style={{ color: '#4361EE', fontWeight: '700' }}>Masuk</Link>
        </p>
      </div>
    </div>
  )
}
