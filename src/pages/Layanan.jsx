import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccess } from '../components/Layout'
import { can } from '../lib/access'

const emptyForm = { name: '', unit: 'kg', price: '' }

export default function LayananPage() {
  const { role, businessId } = useAccess()
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const loadServices = async () => {
    const { data, error } = await supabase.from('services').select('*').order('name')
    if (error) return alert('Gagal memuat layanan: ' + error.message)
    setServices(data || [])
  }

  useEffect(() => { loadServices() }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const submit = async event => {
    event.preventDefault()
    if (!form.name.trim() || form.price === '') return alert('Nama layanan dan harga wajib diisi.')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Sesi login berakhir. Silakan login ulang.')
    const payload = { name: form.name.trim(), unit: form.unit, price: Number(form.price), user_id: user.id, business_id: businessId }
    const query = editingId
      ? supabase.from('services').update(payload).eq('id', editingId)
      : supabase.from('services').insert([payload])
    const { data, error } = await query.select()
    if (error) return alert('Gagal menyimpan layanan: ' + error.message)
    setServices(current => editingId
      ? current.map(service => service.id === editingId ? data[0] : service)
      : [...current, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
    resetForm()
  }

  const edit = service => {
    setEditingId(service.id)
    setForm({ name: service.name, unit: service.unit, price: service.price })
    setShowForm(true)
  }

  const remove = async service => {
    if (!confirm(`Hapus layanan ${service.name}?`)) return
    const { error } = await supabase.from('services').delete().eq('id', service.id)
    if (error) return alert('Gagal menghapus layanan: ' + error.message)
    setServices(current => current.filter(item => item.id !== service.id))
  }

  const canManage = can(role, 'serviceManage')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111' }}>Layanan & Harga</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Atur paket laundry yang dipakai saat membuat transaksi.</p>
        </div>
        {canManage && <button onClick={() => showForm ? resetForm() : setShowForm(true)} style={{ background: '#4361EE', color: 'white', padding: '10px 18px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' }}>{showForm ? 'Batal' : '+ Tambah Layanan'}</button>}
      </div>

      {showForm && canManage && (
        <form onSubmit={submit} style={{ background: 'white', padding: '18px', borderRadius: '16px', border: '1px solid #eef2f7', marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>NAMA LAYANAN
            <input required placeholder="Contoh: Cuci Kering Setrika" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>SATUAN
            <select value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <option value="kg">kg</option><option value="pcs">pcs</option><option value="m2">m²</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>HARGA PER SATUAN
            <input required type="number" min="0" placeholder="Contoh: 8000" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          </label>
          <button type="submit" style={{ alignSelf: 'end', minHeight: '42px', background: '#111', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>{editingId ? 'Simpan Perubahan' : 'Simpan Layanan'}</button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginTop: '20px' }}>
        {services.length === 0 ? <div style={{ background: 'white', padding: '24px', borderRadius: '16px', color: '#94a3b8' }}>Belum ada layanan.</div> : services.map(service => (
          <div key={service.id} style={{ background: 'white', padding: '18px', borderRadius: '16px', border: '1px solid #eef2f7' }}>
            <strong style={{ color: '#111827' }}>{service.name}</strong>
            <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '12px' }}>Rp {Number(service.price).toLocaleString('id-ID')} <span style={{ fontSize: '13px', color: '#64748b' }}>/{service.unit}</span></div>
            {canManage && <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}><button onClick={() => edit(service)} style={{ flex: 1, border: 'none', background: '#F1F5F9', padding: '8px', borderRadius: '9px', cursor: 'pointer', fontWeight: '700' }}>Edit</button><button onClick={() => remove(service)} style={{ flex: 1, border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '8px', borderRadius: '9px', cursor: 'pointer', fontWeight: '700' }}>Hapus</button></div>}
          </div>
        ))}
      </div>
    </div>
  )
}
