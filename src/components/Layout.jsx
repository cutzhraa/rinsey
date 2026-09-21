import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { canAccess, normalizeRole, ROLE_LABELS, routeForPath } from '../lib/access'
import { createContext, useContext } from 'react'

export const AccessContext = createContext({ role: null, loading: true, error: null })
export const useAccess = () => useContext(AccessContext)

export default function Layout({ children }){
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [user, setUser] = useState(null)
  const [business, setBusiness] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [role, setRole] = useState(null)
  const [contextLoading, setContextLoading] = useState(true)
  const [contextError, setContextError] = useState('')
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
    const loadContext = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        setContextError('Gagal memuat profil pengguna: ' + userError.message)
        setContextLoading(false)
        return
      }
      setUser(userData.user)

      const { data: context, error: contextError } = await supabase.rpc('get_my_business_context')
      if (contextError) {
        setContextError('Gagal memuat role bisnis: ' + contextError.message)
        setContextLoading(false)
        return
      }
      const activeContext = context?.[0]
      if (activeContext) {
        setBusiness({ id: activeContext.out_business_id, business_name: activeContext.out_business_name })
        setRole(normalizeRole(activeContext.out_role))
      } else {
        setContextError('Akun ini belum memiliki akses ke bisnis.')
      }
      setContextLoading(false)
    }
    loadContext()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const route = routeForPath(location.pathname)
  const unauthorized = !contextLoading && (!role || (route && !canAccess(role, route)))
  const accessValue = { role, businessId: business?.id || null, loading: contextLoading, error: contextError }

  return (
    <AccessContext.Provider value={accessValue}>
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
          <div style={{padding:'20px', fontWeight:'900', fontSize:'22px'}}>{business?.business_name || 'RINSEY.'}</div>
          <nav style={{flex:1, padding:'10px', display:'flex', flexDirection:'column', gap:'6px'}}>
            <NavLink to="/" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Dashboard</NavLink>
            {canAccess(role, 'customers') && <NavLink to="/pelanggan" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Pelanggan</NavLink>}
            {canAccess(role, 'transactions') && <NavLink to="/transaksi" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Transaksi</NavLink>}
            {canAccess(role, 'finance') && <NavLink to="/keuangan" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Keuangan</NavLink>}
            {canAccess(role, 'inventory') && <NavLink to="/stok" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Stok</NavLink>}
            {canAccess(role, 'services') && <NavLink to="/layanan" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Layanan</NavLink>}
            {canAccess(role, 'team') && <NavLink to="/tim" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Kelola Tim</NavLink>}
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
                  {business?.business_name || 'Rinsey'}
                </span>
              </div>
            </button>
            {profileOpen && (
              <div
                role="menu"
                style={{position:'absolute', top:'52px', right:0, width:'250px', padding:'8px', background:'white', border:'1px solid #e2e8f0', borderRadius:'14px', boxShadow:'0 12px 30px rgba(15,23,42,0.14)', zIndex:60}}
              >
                <div style={{padding:'10px 12px', borderBottom:'1px solid #f1f5f9', marginBottom:'6px'}}>
                  <div style={{fontSize:'12px', fontWeight:'800', color:'#111827'}}>{business?.business_name || 'Rinsey'}</div>
                  <div style={{fontSize:'12px', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {user?.email || 'Akun aktif'}
                  </div>
                  <div style={{fontSize:'12px', color:'#64748b', marginTop:'4px'}}>
                    Role: {role ? ROLE_LABELS[role] || role : 'Memuat...'}
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
          {contextLoading ? <p style={{ color: '#64748b' }}>Memuat akses pengguna...</p> : contextError ? (
            <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '16px', borderRadius: '12px' }}>{contextError}</div>
          ) : unauthorized ? (
            <div style={{ background: '#FFF7ED', color: '#9A3412', padding: '20px', borderRadius: '12px' }}>
              <h2 style={{ marginTop: 0 }}>Akses tidak diizinkan</h2>
              <p>Role {ROLE_LABELS[role] || role} tidak memiliki akses ke halaman ini.</p>
              <button onClick={() => navigate('/')} style={{ background: '#111', color: 'white', border: 0, borderRadius: '8px', padding: '10px 14px', fontWeight: 700 }}>Kembali ke dashboard</button>
            </div>
          ) : children}
        </div>
      </div>
    </div>
    </AccessContext.Provider>
  )
}