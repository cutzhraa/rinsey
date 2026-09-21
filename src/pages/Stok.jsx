import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { name: '', quantity: 0, unit: 'pcs', min_quantity: 0, cost_price: 0 }

export default function StokPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('inventory_items').select('*').order('name')
    if (error) {
      console.error('Gagal memuat stok:', error)
      alert('Gagal memuat stok. Pastikan migration Keuangan + Stok sudah dijalankan di Supabase.')
    }
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false) }
  const openEdit = item => {
    setEditingId(item.id)
    setForm({ name: item.name, quantity: item.quantity, unit: item.unit, min_quantity: item.min_quantity, cost_price: item.cost_price })
    setShowForm(true)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!form.name.trim()) return alert('Nama barang wajib diisi.')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Sesi login berakhir. Silakan login ulang.')
    const payload = { ...form, quantity: Number(form.quantity), min_quantity: Number(form.min_quantity), cost_price: Number(form.cost_price), updated_at: new Date().toISOString() }
    const query = editingId
      ? supabase.from('inventory_items').update(payload).eq('id', editingId)
      : supabase.from('inventory_items').insert([{ ...payload, user_id: user.id }])
    const { data, error } = await query.select()
    if (error) return alert('Gagal menyimpan stok: ' + error.message)
    setItems(prev => editingId ? prev.map(item => item.id === editingId ? data[0] : item) : [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
    resetForm()
  }

  const handleDelete = async item => {
    if (!confirm(`Hapus stok ${item.name}?`)) return
    const { error } = await supabase.from('inventory_items').delete().eq('id', item.id)
    if (error) return alert('Gagal menghapus stok: ' + error.message)
    setItems(prev => prev.filter(value => value.id !== item.id))
  }

  if (loading) return <div style={{ color: '#64748b' }}>Memuat stok...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div><h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111' }}>Stok Barang</h1><p style={{ color: '#64748b', marginTop: '4px' }}>Kelola pewangi, deterjen, plastik, dan perlengkapan laundry</p></div>
        <button onClick={() => showForm ? resetForm() : setShowForm(true)} style={{ background: '#4361EE', color: 'white', padding: '10px 18px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' }}>{showForm ? 'Batal' : '+ Tambah Stok'}</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '18px', borderRadius: '16px', border: '1px solid #eef2f7', marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <input placeholder="Nama barang" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <input type="number" min="0" step="0.1" placeholder="Jumlah" value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <input placeholder="Satuan (liter, pcs)" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <input type="number" min="0" step="0.1" placeholder="Batas minimum" value={form.min_quantity} onChange={event => setForm({ ...form, min_quantity: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <input type="number" min="0" placeholder="Harga beli" value={form.cost_price} onChange={event => setForm({ ...form, cost_price: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <button type="submit" style={{ background: '#111', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>{editingId ? 'Simpan Perubahan' : 'Simpan Stok'}</button>
        </form>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginTop: '20px' }}>
        {items.length === 0 ? <div style={{ background: 'white', padding: '24px', borderRadius: '16px', color: '#94a3b8' }}>Belum ada stok barang.</div> : items.map(item => {
          const low = Number(item.quantity) <= Number(item.min_quantity)
          return <div key={item.id} style={{ background: 'white', padding: '18px', borderRadius: '16px', border: `1px solid ${low ? '#FECACA' : '#eef2f7'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><b style={{ color: '#111827' }}>{item.name}</b><span style={{ fontSize: '11px', fontWeight: '800', color: low ? '#DC2626' : '#059669' }}>{low ? 'STOK MENIPIS' : 'AMAN'}</span></div>
            <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '14px', color: low ? '#DC2626' : '#111827' }}>{item.quantity} <span style={{ fontSize: '13px', color: '#64748b' }}>{item.unit}</span></div>
            <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Minimum {item.min_quantity} {item.unit} • Rp {Number(item.cost_price).toLocaleString('id-ID')}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}><button onClick={() => openEdit(item)} style={{ flex: 1, border: 'none', background: '#F1F5F9', padding: '8px', borderRadius: '9px', cursor: 'pointer', fontWeight: '700' }}>Edit</button><button onClick={() => handleDelete(item)} style={{ flex: 1, border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '8px', borderRadius: '9px', cursor: 'pointer', fontWeight: '700' }}>Hapus</button></div>
          </div>
        })}
      </div>
    </div>
  )
}
