import { useState } from 'react'
import { LayoutDashboard, Users, Scissors, Package, LogOut, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const nav = useNavigate()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  
  const menu = [
    { path:'/', label:'Dashboard', icon: LayoutDashboard },
    { path:'/pelanggan', label:'Pelanggan', icon: Users },
    { path:'/layanan', label:'Layanan', icon: Scissors },
    { path:'/transaksi', label:'Transaksi', icon: Package },
  ]

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc', fontFamily:'Inter, sans-serif'}}>
      {/* NAVBAR ATAS - BERSIH */}
      <div style={{height:'64px', background:'white', borderBottom:'1px solid #eef2f7', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', position:'sticky', top:0, zIndex:10}}>
        <h2 style={{fontWeight:'900', color:'#111', letterSpacing:'-1px', margin:0}}>RINSEY.</h2>
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
          <Bell size={20} color="#94a3b8" />
          <div style={{width:'32px', height:'32px', background:'black', borderRadius:'50%', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'13px'}}>R</div>
        </div>
      </div>

      <div style={{display:'flex'}}>
        {/* SIDEBAR + TOMBOL NEMPEL */}
        <div style={{width: collapsed ? '80px' : '240px', background:'white', borderRight:'1px solid #eef2f7', padding:'24px', minHeight:'calc(100vh - 64px)', transition:'all 0.2s', position:'relative'}}>
          
          {/* TOMBOL BULAT DI PINGGIR SIDEBAR */}
          <button 
            onClick={()=> setCollapsed(!collapsed)}
            style={{
              position:'absolute',
              right:'-14px',
              top:'24px',
              background:'white',
              border:'1px solid #e2e8f0',
              width:'28px',
              height:'28px',
              borderRadius:'50%',
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              boxShadow:'0 2px 6px rgba(0,0,0,0.1)',
              zIndex:5
            }}
          >
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>

          <p style={{fontSize:'11px', fontWeight:'800', color:'#94a3b8', letterSpacing:'1px', marginBottom:'12px'}}>{!collapsed ? 'MENU' : '...'}</p>
          <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
            {menu.map(m => {
              const Icon = m.icon
              const active = loc.pathname === m.path
              return (
                <Link key={m.path} to={m.path} style={{
                  textDecoration:'none', padding:'11px 14px', borderRadius:'10px',
                  background: active ? 'black' : 'transparent',
                  color: active ? 'white' : '#64748b', fontWeight:'600', fontSize:'14px',
                  display:'flex', gap:'10px', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start'
                }}>
                  <Icon size={18} /> {!collapsed && m.label}
                </Link>
              )
            })}
          </div>
          <button onClick={async()=>{await supabase.auth.signOut(); nav('/login')}} 
            style={{marginTop:'32px', background:'#f8fafc', color:'#64748b', border:'1px solid #eef2f7', padding:'11px', width:'100%', borderRadius:'10px', fontWeight:'700', cursor:'pointer', display:'flex', gap:'8px', justifyContent:'center', alignItems:'center'}}>
            <LogOut size={18} /> {!collapsed && "Keluar"}
          </button>
        </div>

        {/* CONTENT */}
        <div style={{flex:1, padding:'32px'}}>
          {children}
        </div>
      </div>
    </div>
  )
}