import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TransaksiPage() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  // State Form Transaksi Baru
  const [form, setForm] = useState({
    customer_id: '',
    service_id: '',
    weight: 1,
    payment_status: 'belum',
    payment_method: 'cash'
  })

  // Load Data
  const fetchData = async () => {
    const { data: cust } = await supabase.from('customers').select('*').order('name')
    const { data: serv } = await supabase.from('services').select('*').order('name')
    const { data: ord } = await supabase
      .from('orders')
      .select('*, customers(name, phone), services(name, unit, price)')
      .order('created_at', { ascending: false })

    setCustomers(cust || [])
    setServices(serv || [])
    setOrders(ord || [])
  }

  useEffect(() => { fetchData() }, [])

  // Hitung Total Price Realtime
  const selectedService = services.find(s => s.id === form.service_id)
  const calculatedTotal = selectedService ? (selectedService.price * Number(form.weight || 0)) : 0

  // Handle Simpan Order Baru
  const handleCreateOrder = async (e) => {
    e.preventDefault()
    if (!form.customer_id || !form.service_id || !form.weight) {
      return alert('Pilih pelanggan, layanan, dan isi berat/jumlah!')
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Sesi login berakhir!')
      setLoading(false)
      return
    }

    // Generate Invoice Number sederhana (misal: INV-20260920-XXXX)
    const invNo = `INV-${Date.now().toString().slice(-6)}`

    const payload = {
      user_id: user.id,
      invoice_no: invNo,
      customer_id: form.customer_id,
      service_id: form.service_id,
      weight: Number(form.weight),
      total_price: calculatedTotal,
      status: 'masuk',
      payment_status: form.payment_status,
      payment_method: form.payment_method
    }

    const { data, error } = await supabase.from('orders').insert([payload]).select('*, customers(name, phone), services(name, unit, price)')

    setLoading(false)
    if (error) {
      alert('Gagal membuat transaksi: ' + error.message)
    } else {
      setOrders([data[0], ...orders])
      setShowAdd(false)
      setForm({ customer_id: '', service_id: '', weight: 1, payment_status: 'belum', payment_method: 'cash' })
      alert('Transaksi berhasil dibuat!')
    }
  }

  // Handle Update Status Transaksi
  const handleUpdateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date() }).eq('id', id)
    if (error) alert(error.message)
    else {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o))
    }
  }

  // Handle Update Status Bayar
  const handleTogglePayment = async (o) => {
    const nextPayment = o.payment_status === 'lunas' ? 'belum' : 'lunas'
    const { error } = await supabase.from('orders').update({ payment_status: nextPayment }).eq('id', o.id)
    if (error) alert(error.message)
    else {
      setOrders(orders.map(item => item.id === o.id ? { ...item, payment_status: nextPayment } : item))
    }
  }

  // Direct Kirim Struk via WhatsApp
  const sendWhatsAppReceipt = (o) => {
    if (!o.customers?.phone) return alert('Nomor HP pelanggan tidak ditemukan!')
    
    // Format nomor WA Indonesia (ubah 08... jadi 628...)
    let phone = o.customers.phone.trim()
    if (phone.startsWith('0')) phone = '62' + phone.slice(1)

    const text = `*RINSEY LAUNDRY - NOTA TRANSAKSI*\n` +
      `--------------------------------\n` +
      `No. Invoice : ${o.invoice_no || '-'}\n` +
      `Pelanggan   : ${o.customers?.name}\n` +
      `Layanan     : ${o.services?.name}\n` +
      `Jumlah/Berat: ${o.weight} ${o.services?.unit || 'kg'}\n` +
      `Total Bayar : Rp ${o.total_price?.toLocaleString('id-ID')}\n` +
      `Status Bayar: ${o.payment_status?.toUpperCase()}\n` +
      `Status Cucian: ${o.status?.toUpperCase()}\n` +
      `--------------------------------\n` +
      `Terima kasih telah mempercayakan cucian Anda di Rinsey Laundry! 🧺`

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  const filteredOrders = orders.filter(o =>
    o.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.invoice_no?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (st) => {
    switch (st) {
      case 'masuk': return { bg: '#FEF3C7', color: '#D97706' }
      case 'dicuci': return { bg: '#E0F2FE', color: '#0284C7' }
      case 'disetrika': return { bg: '#F3E8FF', color: '#9333EA' }
      case 'selesai': return { bg: '#D1FAE5', color: '#059669' }
      case 'diambil': return { bg: '#F1F5F9', color: '#64748B' }
      default: return { bg: '#F1F5F9', color: '#64748B' }
    }
  }

  return (
    <div>
      {/* HEADER & BTN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111' }}>Transaksi</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Kelola pesanan dan kasir laundry</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ background: '#4361EE', color: 'white', padding: '10px 18px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', border: 'none' }}
        >
          {showAdd ? 'Batal' : '+ Transaksi Baru'}
        </button>
      </div>

      {/* FORM INPUT TRANSAKSI BARU */}
      {showAdd && (
        <form onSubmit={handleCreateOrder} style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #eef2f7', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>Buat Transaksi Baru</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {/* SELECT PELANGGAN */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>PELANGGAN *</label>
              <select
                value={form.customer_id}
                onChange={e => setForm({ ...form, customer_id: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                required
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            {/* SELECT LAYANAN */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>LAYANAN / PAKET *</label>
              <select
                value={form.service_id}
                onChange={e => setForm({ ...form, service_id: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                required
              >
                <option value="">-- Pilih Layanan --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - Rp {s.price?.toLocaleString('id-ID')}/{s.unit || 'kg'}</option>
                ))}
              </select>
            </div>

            {/* INPUT BERAT / JUMLAH */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>BERAT / JUMLAH ({selectedService?.unit || 'kg'}) *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px', boxSizing: 'border-box' }}
                required
              />
            </div>

            {/* STATUS BAYAR */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>STATUS PEMBAYARAN</label>
              <select
                value={form.payment_status}
                onChange={e => setForm({ ...form, payment_status: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}
              >
                <option value="belum">Belum Lunas</option>
                <option value="lunas">Lunas</option>
              </select>
            </div>
          </div>

          {/* TOTAL SUMMARY CARD */}
          <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>TOTAL ESTIMASI BAYAR</span>
              <h2 style={{ margin: 0, color: '#4361EE', fontSize: '24px', fontWeight: '800' }}>Rp {calculatedTotal.toLocaleString('id-ID')}</h2>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ background: '#111', color: 'white', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      )}

      {/* SEARCH BAR */}
      <input
        placeholder="Cari transaksi berdasarkan invoice atau pelanggan..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginTop: '16px', width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', outline: 'none', boxSizing: 'border-box' }}
      />

      {/* DAFTAR TRANSAKSI TABLE / CARDS */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ background: 'white', padding: '30px', textAlign: 'center', borderRadius: '16px', color: '#94a3b8' }}>
            Belum ada transaksi ditemukan.
          </div>
        ) : (
          filteredOrders.map(o => {
            const badge = getStatusColor(o.status)
            return (
              <div key={o.id} style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #eef2f7', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                {/* INFO UTAMA */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: '#111' }}>{o.invoice_no || 'INV-000'}</span>
                    <span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                      {o.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>
                    👤 {o.customers?.name || 'Pelanggan Umum'} <span style={{ color: '#94a3b8', fontWeight: '400' }}>({o.customers?.phone})</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    📦 {o.services?.name || 'Paket Custom'} • {o.weight} {o.services?.unit || 'kg'}
                  </div>
                </div>

                {/* HARGA & STATUS BAYAR */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#111' }}>
                    Rp {o.total_price?.toLocaleString('id-ID')}
                  </div>
                  <button
                    onClick={() => handleTogglePayment(o)}
                    style={{
                      marginTop: '4px',
                      background: o.payment_status === 'lunas' ? '#D1FAE5' : '#FEE2E2',
                      color: o.payment_status === 'lunas' ? '#059669' : '#DC2626',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {o.payment_status === 'lunas' ? '✓ LUNAS' : '✗ BELUM BAYAR'}
                  </button>
                </div>

                {/* ACTION BUTTONS (UPDATE STATUS & WA) */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', borderTop: '1px solid #f8fafc', paddingTop: '10px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Ubah Status:</span>
                    <select
                      value={o.status}
                      onChange={e => handleUpdateStatus(o.id, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <option value="masuk">Masuk</option>
                      <option value="dicuci">Dicuci</option>
                      <option value="disetrika">Disetrika</option>
                      <option value="selesai">Selesai</option>
                      <option value="diambil">Diambil</option>
                    </select>
                  </div>

                  <button
                    onClick={() => sendWhatsAppReceipt(o)}
                    style={{ background: '#25D366', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    💬 Kirim WA Struk
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}