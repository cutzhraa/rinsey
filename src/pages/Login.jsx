import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if(error) alert(error.message)
    else nav('/')
  }

  return (
    <div style={{
      display:'flex', height:'100vh', justifyContent:'center', alignItems:'center',
      background: 'radial-gradient(circle at top left, #e0f2fe, #f0f9ff, #ffffff)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background:'white', padding:'36px', borderRadius:'20px', width:'360px',
        boxShadow:'0 10px 40px rgba(0,0,0,0.08)', border:'1px solid #f0f0f0'
      }}>
        <div style={{textAlign:'center', marginBottom:'24px'}}>
          <div style={{fontSize:'40px'}}>🧺</div>
          <h2 style={{margin:'8px 0 4px', fontWeight:'800', color:'#111827'}}>Rinsey Laundry</h2>
          <p style={{margin:0, color:'#9ca3af', fontSize:'14px'}}>Masuk untuk kelola cucian</p>
        </div>

        <form onSubmit={handleLogin}>
          <label style={{fontSize:'13px', fontWeight:'600', color:'#374151'}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} 
            style={{
              width:'100%', padding:'12px 14px', margin:'6px 0 16px',
              borderRadius:'10px', border:'1px solid #e5e7eb', outline:'none',
              background:'#f9fafb', color:'#111', boxSizing:'border-box'
            }} 
          />

          <label style={{fontSize:'13px', fontWeight:'600', color:'#374151'}}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} 
            style={{
              width:'100%', padding:'12px 14px', margin:'6px 0 24px',
              borderRadius:'10px', border:'1px solid #e5e7eb', outline:'none',
              background:'#f9fafb', color:'#111', boxSizing:'border-box'
            }} 
          />

          <button type="submit" disabled={loading}
            style={{
              width:'100%', padding:'12px', background:'black', color:'white',
              border:'none', borderRadius:'10px', fontWeight:'700', cursor:'pointer',
              transition:'0.2s', opacity: loading ? 0.6 : 1
            }}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <p style={{textAlign:'center', fontSize:'13px', color:'#64748b', marginTop:'20px'}}>
          Belum punya akun? <Link to="/register" style={{color:'#4361EE', fontWeight:'700'}}>Daftar gratis</Link>
        </p>

        {/* <p style={{textAlign:'center', fontSize:'12px', color:'#9ca3af', marginTop:'20px'}}>
          Demo: admin@cutzhraa.com / admin123
        </p> */}
      </div>
    </div>
  )
}