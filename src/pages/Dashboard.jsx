import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [count, setCount] = useState(0)
  useEffect(()=>{
    supabase.from('customers').select('id', {count:'exact'}).then(({count})=>setCount(count||0))
  }, [])

  return (
    <div>
      <h1 style={{fontSize:'28px', fontWeight:'800', color:'#111'}}>Dashboard</h1>
      <p style={{color:'#64748b'}}></p>
      <div style={{background:'white', padding:'20px', borderRadius:'16px', border:'1px solid #eef2f7', marginTop:'20px'}}>
        <small style={{color:'#94a3b8'}}>TOTAL PELANGGAN</small>
        <h2 style={{color:'#111'}}>{count} Orang</h2>
      </div>
    </div>
  )
}