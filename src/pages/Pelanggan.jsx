import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PelangganPage() {
  const [list, setList] = useState([])
  const [orderStatsMap, setOrderStatsMap] = useState({})
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null) // ID pelanggan yang lagi diedit (null kalau mode Tambah)
  const [loading, setLoading] = useState(false)

  // State Form (Termasuk 'notes')
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })

  const fetchAll = async () => {
    // 1. Ambil data pelanggan
    const { data: cust } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    // 2. Ambil data pesanan untuk statistik total cuci & bayar
    const { data: ord } = await supabase.from('orders').select('customer_id, total_price')

    const statsMap = {}
    ord?.forEach(o => {
      if (!o.customer_id) return
      if (!statsMap[o.customer_id]) statsMap[o.customer_id] = { count: 0, total: 0 }
      statsMap[o.customer_id].count += 1
      statsMap[o.customer_id].total += (o.total_price || 0)
    })

    setList(cust || [])
    setOrderStatsMap(statsMap)
  }

  useEffect(() => { fetchAll() }, [])

  // Buka Form Tambah
  const handleOpenAdd = () => {
    setEditingId(null)
    setForm({ name: '', phone: '', address: '', notes: '' })
    setShowForm(true)
  }

  // Buka Form Edit
  const handleOpenEdit = (customer) => {
    setEditingId(customer.id)
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || ''
    })
    setShowForm(true)
  }

  // Reset / Batal
  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', phone: '', address: '', notes: '' })
  }

  // Handle Simpan (Bisa Tambah Baru atau Edit)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) return alert('Nama & No WA wajib diisi!')

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Sesi login telah habis. Silakan login ulang.')
      setLoading(false)
      return
    }

    if (editingId) {
      // --- MODE EDIT ---
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: form.name,
          phone: form.phone,
          address: form.address,
          notes: form.notes,
          updated_at: new Date()
        })
        .eq('id', editingId)
        .select()

      setLoading(false)
      if (error) {
        alert('Gagal mengupdate pelanggan: ' + error.message)
      } else {
        setList(list.map(c => c.id === editingId ? data[0] : c))
        handleCancel()
      }
    } else {
      // --- MODE TAMBAH BARU ---
      const payload = { ...form, user_id: user.id }
      const { data, error } = await supabase.from('customers').insert([payload]).select()

      setLoading(false)
      if (error) {
        alert('Gagal menambah pelanggan: ' + error.message)
      } else {
        setList([data[0], ...list])
        handleCancel()
      }
    }
  }

  // Handle Hapus
  const handleDelete = async (id) => {
    if (!confirm('Hapus pelanggan ini? Semua riwayat pesanan terkait juga akan terhapus.')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) alert(error.message)
    else setList(list.filter(c => c.id !== id))
  }

  const filtered = list.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111' }}>Pelanggan</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Kelola data dan preferensi pelanggan</p>
        </div>
        <button
          onClick={showForm ? handleCancel : handleOpenAdd}
          style={{ background: showForm ? '#64748b' : '#4361EE', color: 'white', padding: '10px 18px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', border: 'none' }}
        >
          {showForm ? 'Batal' : '+ Pelanggan Baru'}
        </button>
      </div>

      {/* SEARCH BAR */}
      <input
        placeholder="Cari nama, no. WA, atau catatan khusus (misal: Baccarat)..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginTop: '16px', width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', outline: 'none', boxSizing: 'border-box' }}
      />

      {/* FORM INPUT / EDIT */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #eef2f7', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontWeight: '800', color: '#111', fontSize: '16px' }}>
            {editingId ? '✏️ Edit Data Pelanggan' : '➕ Tambah Pelanggan Baru'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <input
              placeholder="Nama Pelanggan *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
              required
            />
            <input
              placeholder="No WA (08...) *"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
              required
            />
            <input
              placeholder="Alamat Jemput / Rumah"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
            />
          </div>

          {/* INPUT NOTE KHUSUS */}
          <textarea
            placeholder="Catatan Khusus / Preferensi (Contoh: Pakai pewangi Baccarat, Baju putih dipisah)"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{ background: '#f1f5f9', color: '#64748b', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ background: '#111', color: 'white', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : 'Simpan Pelanggan')}
            </button>
          </div>
        </form>
      )}

      {/* LIST PELANGGAN */}
      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {filtered.length === 0 ? (
          <div style={{ background: 'white', padding: '30px', textAlign: 'center', borderRadius: '20px', color: '#94a3b8', gridColumn: '1 / -1' }}>
            Pelanggan tidak ditemukan.
          </div>
        ) : (
          filtered.map(c => {
            const stat = orderStatsMap[c.id] || { count: 0, total: 0 }
            return (
              <div key={c.id} style={{ background: 'white', borderRadius: '20px', border: '1px solid #eef2f7', padding: '18px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* HEADER CARD & ACTION BTNS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#111', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: '#111' }}>{c.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>{c.phone}</div>
                      </div>
                    </div>

                    {/* ACTION EDIT & DELETE */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Data"
                        style={{ border: 'none', background: '#f8fafc', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        title="Hapus Data"
                        style={{ border: 'none', background: '#f8fafc', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: '700' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* ALAMAT */}
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                    📍 {c.address || 'Tanpa alamat'}
                  </div>

                  {/* NOTE / PREFERENSI KHUSUS */}
                  {c.notes && (
                    <div style={{ marginTop: '10px', background: '#FEF3C7', color: '#92400E', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>
                      📝 <b>Catatan:</b> {c.notes}
                    </div>
                  )}
                </div>

                {/* STATISTIK */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>TOTAL CUCI</div>
                    <div style={{ fontWeight: '800', marginTop: '2px', color: '#334155' }}>{stat.count} kali</div>
                  </div>
                  <div style={{ background: '#EEF2FF', padding: '10px 12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#4361EE', fontWeight: '700' }}>TOTAL BAYAR</div>
                    <div style={{ fontWeight: '800', color: '#4361EE', marginTop: '2px' }}>Rp {stat.total.toLocaleString('id-ID')}</div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}