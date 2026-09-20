import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PelangganPage(){
  const [list, setList] = useState([])
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })

  const fetchAll = async () => {
    const { data: cust } = await supabase.from('customers').select('*').order('created_at', {ascending: false})
    const { data: ord } = await supabase.from('orders').select('customer_id, total_price, weight')
    setList(cust || [])
    setOrders(ord || [])
  }
  useEffect(()=>{ fetchAll() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if(!form.name ||!form.phone) return alert('Nama & HP wajib!')
    const { data, error } = await supabase.from('customers').insert(form).select()
    if(error) alert(error.message)
    else { setList([data[0],...list]); setForm({name:'', phone:'', address:''}); setShowAdd(false) }
  }

  const handleDelete = async (id) => {
    if(!confirm('Hapus pelanggan ini?')) return
    await supabase.from('customers').delete().eq('id', id)
    setList(list.filter(c => c.id!== id))
  }

  const getStats = (custId) => {
    const custOrders = orders.filter(o => o.customer_id === custId)
    return {
      count: custOrders.length,
      total: custOrders.reduce((s,o)=> s + (o.total_price||0), 0)
    }
  }

  const filtered = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{fontSize:'28px', fontWeight:'800', color:'#111'}}>Pelanggan</h1>
        <button onClick={()=>setShowAdd(!showAdd)} style={{background:'#4361EE', color:'white', padding:'10px 18px', borderRadius:'12px', fontWeight:'700', cursor:'pointer', border:'none'}}>+ Pelanggan Baru</button>
      </div>

      <input placeholder="Cari pelanggan..." value={search} onChange={e=>setSearch(e.target.value)}
        style={{marginTop:'16px', width:'100%', padding:'14px 16px', borderRadius:'14px', border:'1px solid #e2e8f0', background:'white'}} />

      {showAdd && (
        <form onSubmit={handleAdd} style={{background:'white', padding:'16px', borderRadius:'16px', border:'1px solid #eef2f7', marginTop:'12px', display:'flex', flexDirection:'column', gap:'10px'}}>
          <input placeholder="Nama Pelanggan" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} style={{padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} />
          <input placeholder="No WA (08...)" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} style={{padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} />
          <input placeholder="Alamat Jemput" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} style={{padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0'}} />
          <button type="submit" style={{background:'#111', color:'white', padding:'12px', borderRadius:'10px', fontWeight:'700'}}>Simpan Pelanggan</button>
        </form>
      )}

      <div style={{marginTop:'20px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'14px'}}>
        {filtered.map(c=>{
          const stat = getStats(c.id)
          return (
            <div key={c.id} style={{background:'white', borderRadius:'20px', border:'1px solid #eef2f7', padding:'16px', position:'relative'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <div style={{display:'flex', gap:'12px'}}>
                  <div style={{width:'48px', height:'48px', borderRadius:'14px', background:'#111', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px'}}>👕</div>
                  <div>
                    <div style={{fontWeight:'800', fontSize:'15px', color:'#111'}}>{c.name}</div>
                    <div style={{fontSize:'13px', color:'#64748b'}}>{c.phone} • {c.address?.slice(0,20) || 'Tanpa alamat'}</div>
                  </div>
                </div>
                <button onClick={()=>handleDelete(c.id)} style={{border:'none', background:'#f8fafc', width:'30px', height:'30px', borderRadius:'8px', cursor:'pointer'}}>✕</button>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'14px'}}>
                <div style={{background:'#f8fafc', padding:'10px 12px', borderRadius:'12px'}}>
                  <div style={{fontSize:'10px', color:'#94a3b8', fontWeight:'700'}}>TOTAL CUCI</div>
                  <div style={{fontWeight:'800', marginTop:'2px'}}>{stat.count} kali</div>
                </div>
                <div style={{background:'#EEF2FF', padding:'10px 12px', borderRadius:'12px'}}>
                  <div style={{fontSize:'10px', color:'#4361EE', fontWeight:'700'}}>TOTAL BAYAR</div>
                  <div style={{fontWeight:'800', color:'#4361EE', marginTop:'2px'}}>Rp {stat.total.toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}