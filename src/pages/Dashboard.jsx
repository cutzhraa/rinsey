import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState({ customers: 0, orders: 0, revenue: 0, pending: 0 })
  const [chart, setChart] = useState([])
  const [statusCount, setStatusCount] = useState({})
  const [recent, setRecent] = useState([])

  useEffect(() => {
    async function load() {
      const { count: custCount } = await supabase.from('customers').select('id', { count: 'exact', head: true })
      const { data: allOrders } = await supabase.from('orders').select('id, total_price, status, created_at')
      const { data: recentOrders } = await supabase.from('orders').select('*, customers(name)').order('created_at', { ascending: false }).limit(5)

      // stats
      const pending = allOrders?.filter(o => o.status === 'pending').length || 0
      const revenue = allOrders?.reduce((s, o) => s + (o.total_price || 0), 0) || 0
      setStats({ customers: custCount || 0, orders: allOrders?.length || 0, revenue, pending })
      setRecent(recentOrders || [])

      // status breakdown
      const grouped = {}
      allOrders?.forEach(o => { grouped[o.status] = (grouped[o.status] || 0) + 1 })
      setStatusCount(grouped)

      // chart 7 hari terakhir
      const days = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return { key: d.toISOString().slice(0,10), label: d.toLocaleDateString('id-ID', {weekday:'short'}) }
      })
      const chartData = days.map(day => {
        const total = allOrders?.filter(o => o.created_at.slice(0,10) === day.key).reduce((s, o) => s + o.total_price, 0) || 0
        return { name: day.label, pendapatan: total }
      })
      setChart(chartData)
    }
    load()
  }, [])

  const cards = [
    { label: 'TOTAL PELANGGAN', value: `${stats.customers} Orang`, sub: 'Customer aktif', color: '#4361EE' },
    { label: 'TOTAL PESANAN', value: `${stats.orders} Pesanan`, sub: `${stats.pending} pending`, color: '#06D6A0' },
    { label: 'PENDAPATAN', value: `Rp ${stats.revenue.toLocaleString('id-ID')}`, sub: 'Bulan ini', color: '#111' },
    { label: 'PERLU DIPROSES', value: `${stats.pending}`, sub: 'Segera cek', color: '#FF6B6B' },
  ]

  return (
    <div>
      <h1 style={{fontSize:'28px', fontWeight:'800', color:'#111'}}>Dashboard</h1>
      <p style={{color:'#64748b', marginTop:'4px'}}>Ringkasan laundry hari ini</p>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px', marginTop:'24px'}}>
        {cards.map(c => (
          <div key={c.label} style={{background:'white', padding:'20px', borderRadius:'20px', border:'1px solid #eef2f7'}}>
            <small style={{color:'#94a3b8', fontWeight:'700', fontSize:'10px', letterSpacing:'1px'}}>{c.label}</small>
            <h2 style={{color:c.color, margin:'8px 0 4px', fontSize:'22px', fontWeight:'800'}}>{c.value}</h2>
            <span style={{color:'#94a3b8', fontSize:'12px'}}>{c.sub}</span>
          </div>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'16px', marginTop:'16px'}}>
        {/* CHART */}
        <div style={{background:'white', padding:'20px', borderRadius:'20px', border:'1px solid #eef2f7'}}>
          <h3 style={{fontWeight:'700', marginBottom:'16px'}}>Pendapatan 7 Hari</h3>
          <div style={{height:'220px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="pendapatan" fill="#111" radius={[10,10,10,10]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* STATUS */}
        <div style={{background:'white', padding:'20px', borderRadius:'20px', border:'1px solid #eef2f7'}}>
          <h3 style={{fontWeight:'700', marginBottom:'16px'}}>Status Pesanan</h3>
          {Object.keys(statusCount).length === 0 ? <p style={{color:'#94a3b8'}}>Belum ada data</p> :
            Object.entries(statusCount).map(([st, count]) => (
              <div key={st} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9'}}>
                <span style={{textTransform:'capitalize'}}>{st}</span>
                <b style={{background:'#f1f5f9', padding:'2px 10px', borderRadius:'99px'}}>{count}</b>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}