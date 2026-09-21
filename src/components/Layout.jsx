import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout({ children }){
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [user, setUser] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(()=>{
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return ()=>window.removeEventListener('resize', check)
  }, [])

  useEffect(()=>{ if(isMobile) setOpen(false); setProfileOpen(false) }, [location.pathname, isMobile])

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('Gagal memuat profil pengguna:', error)
        return
      }
      setUser(data.user)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{display:'flex', minHeight:'100vh', background:'#f8fafc'}}>
      {open && isMobile && (
        <div onClick={()=>setOpen(false)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:40}}></div>
      )}

      <div style={{
        width:'260px',
        background:'white',
        borderRight:'1px solid #eef2f7',
        position: isMobile ? 'fixed' : 'sticky',
        top:0, left:0, bottom:0,
        zIndex:50,
        transform: isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition:'transform 0.3s ease',
        display:'flex', flexDirection:'column', justifyContent:'space-between'
      }}>
        <div>
          <div style={{padding:'20px', fontWeight:'900', fontSize:'22px'}}>RINSEY.</div>
          <nav style={{flex:1, padding:'10px', display:'flex', flexDirection:'column', gap:'6px'}}>
            <NavLink to="/" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Dashboard</NavLink>
            <NavLink to="/pelanggan" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Pelanggan</NavLink>
            <NavLink to="/transaksi" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Transaksi</NavLink>
          </nav>
        </div>
      </div>

      <div style={{flex:1, minWidth:0}}>
        <div style={{height:'64px', background:'white', borderBottom:'1px solid #eef2f7', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', position:'sticky', top:0, zIndex:30}}>
          <button onClick={()=>setOpen(!open)} style={{width:'40px', height:'40px', borderRadius:'12px', border:'1px solid #e2e8f0', background:'white', display: isMobile ? 'flex' : 'none', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>☰</button>
          <div style={{position:'relative', marginLeft:'auto'}}>
            <button
              onClick={() => setProfileOpen(value => !value)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              style={{display:'flex', alignItems:'center', gap:'10px', padding:'4px 8px 4px 4px', border:'1px solid #e2e8f0', borderRadius:'14px', background:'white', cursor:'pointer'}}
            >
              {logoError ? (
                <div style={{width:'36px', height:'36px', borderRadius:'99px', background:'#111', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700'}}>
                  R
                </div>
              ) : (
                <img
                  src="/rinsey.jpg"
                  alt="Rinsey"
                  onError={() => setLogoError(true)}
                  style={{width:'36px', height:'36px', borderRadius:'99px', objectFit:'cover'}}
                />
              )}
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'1px', maxWidth:'180px'}}>
                <span style={{fontSize:'12px', fontWeight:'800', color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {user?.user_metadata?.full_name || 'Rinsey'}
                </span>
              </div>
            </button>
            {profileOpen && (
              <div
                role="menu"
                style={{position:'absolute', top:'52px', right:0, width:'250px', padding:'8px', background:'white', border:'1px solid #e2e8f0', borderRadius:'14px', boxShadow:'0 12px 30px rgba(15,23,42,0.14)', zIndex:60}}
              >
                <div style={{padding:'10px 12px', borderBottom:'1px solid #f1f5f9', marginBottom:'6px'}}>
                  <div style={{fontSize:'12px', fontWeight:'800', color:'#111827'}}>Rinsey</div>
                  <div style={{fontSize:'12px', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {user?.email || 'Akun aktif'}
                  </div>
                </div>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  style={{width:'100%', padding:'10px 12px', textAlign:'left', border:'none', borderRadius:'10px', background:'transparent', color:'#ef4444', fontWeight:'700', cursor:'pointer'}}
                >
                  Keluar dari akun
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{padding: isMobile ? '16px' : '24px'}}>
          {children}
        </div>
      </div>
    </div>
  )
}