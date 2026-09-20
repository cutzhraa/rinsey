import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export default function Layout({ children }){
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()

  useEffect(()=>{
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return ()=>window.removeEventListener('resize', check)
  }, [])

  useEffect(()=>{ if(isMobile) setOpen(false) }, [location.pathname])

  return (
    <div style={{display:'flex', minHeight:'100vh', background:'#f8fafc'}}>
      {/* OVERLAY HP */}
      {open && isMobile && (
        <div onClick={()=>setOpen(false)} style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:40}}></div>
      )}

      {/* SIDEBAR */}
      <div style={{
        width:'260px',
        background:'white',
        borderRight:'1px solid #eef2f7',
        position: isMobile ? 'fixed' : 'sticky',
        top:0, left:0, bottom:0,
        zIndex:50,
        transform: isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition:'transform 0.3s ease',
        display:'flex', flexDirection:'column'
      }}>
        <div style={{padding:'20px', fontWeight:'900', fontSize:'22px'}}>RINSEY.</div>
        
        <nav style={{flex:1, padding:'10px', display:'flex', flexDirection:'column', gap:'6px'}}>
          <NavLink to="/" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Dashboard</NavLink>
          <NavLink to="/pelanggan" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Pelanggan</NavLink>
          <NavLink to="/transaksi" style={({isActive})=>({padding:'12px', borderRadius:'12px', background:isActive?'#111':'transparent', color:isActive?'white':'#64748b', textDecoration:'none', fontWeight:'600'})}>Transaksi</NavLink>
        </nav>
      </div>

      {/* CONTENT */}
      <div style={{flex:1, minWidth:0}}>
        {/* TOPBAR */}
        <div style={{height:'64px', background:'white', borderBottom:'1px solid #eef2f7', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', position:'sticky', top:0, zIndex:30}}>
          <button onClick={()=>setOpen(!open)} style={{width:'40px', height:'40px', borderRadius:'12px', border:'1px solid #e2e8f0', background:'white', display: isMobile ? 'flex' : 'none', alignItems:'center', justifyContent:'center'}}>☰</button>
          <div style={{fontWeight:'800', display: isMobile ? 'none' : 'block'}}> </div>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <div style={{width:'36px', height:'36px', borderRadius:'99px', background:'#111', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700'}}>R</div>
          </div>
        </div>

        <div style={{padding: isMobile ? '16px' : '24px'}}>
          {children}
        </div>
      </div>
    </div>
  )
}