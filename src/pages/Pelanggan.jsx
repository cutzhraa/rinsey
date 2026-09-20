import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PelangganPage(){
  const [list, setList] = useState([])
  useEffect(()=>{ supabase.from('customers').select('*').then(({data})=>setList(data||[])) }, [])
  return (
    <div>
      <h1 style={{fontSize:'28px', fontWeight:'800', color:'#111'}}>Pelanggan ({list.length})</h1>
      <div style={{marginTop:'16px', display:'flex', flexDirection:'column', gap:'8px'}}>
        {list.map(c=><div key={c.id} style={{background:'white', padding:'14px', borderRadius:'12px', border:'1px solid #eef2f7', color:'#111'}}>{c.name} - {c.phone}</div>)}
      </div>
    </div>
  )
}