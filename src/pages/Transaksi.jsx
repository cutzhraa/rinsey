import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import axios from 'axios'
import { can } from '../lib/access'
import { useAccess } from '../components/Layout'

const orderStatuses = [
  { value: 'masuk', label: 'Masuk', color: '#475569', background: '#F1F5F9' },
  { value: 'dicuci', label: 'Dicuci', color: '#0369A1', background: '#E0F2FE' },
  { value: 'disetrika', label: 'Disetrika', color: '#7C3AED', background: '#EDE9FE' },
  { value: 'selesai', label: 'Selesai', color: '#047857', background: '#D1FAE5' },
  { value: 'diambil', label: 'Diambil', color: '#92400E', background: '#FEF3C7' }
]

export default function TransaksiPage() {
  const { role, businessId } = useAccess()
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [paymentFilter, setPaymentFilter] = useState('semua')
  const [methodFilter, setMethodFilter] = useState('semua')
  const [qrisPayment, setQrisPayment] = useState(null)

  // State Form Transaksi Baru
  const [form, setForm] = useState({
    customer_id: '',
    service_id: '',
    weight: 1,
    status: 'masuk',
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

  const resetForm = () => {
    setForm({ customer_id: '', service_id: '', weight: 1, status: 'masuk', payment_status: 'belum', payment_method: 'cash' })
    setEditingId(null)
    setShowAdd(false)
  }

  const handleOpenEdit = (order) => {
    setEditingId(order.id)
    setForm({
      customer_id: order.customer_id || '',
      service_id: order.service_id || '',
      weight: order.weight || 1,
      status: order.status || 'masuk',
      payment_status: order.payment_status || 'belum',
      payment_method: order.payment_method || 'cash'
    })
    setShowAdd(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Hitung Total Price Realtime
  const selectedService = services.find(s => s.id === form.service_id)
  const calculatedTotal = selectedService ? (selectedService.price * Number(form.weight || 0)) : 0

  // Buat QRIS langsung agar QR tetap tersedia di laptop maupun HP.
  const triggerMidtransPayment = async (order) => {
    try {
      const response = await axios.post('/api/payment', {
        order_id: order.invoice_no || `RINSEY-${order.id}`,
        gross_amount: order.total_price,
        customer_name: order.customers?.name || 'Pelanggan Laundry',
        customer_phone: order.customers?.phone || ''
      })

      const { qr_url: qrUrl, order_id: paymentOrderId } = response.data

      if (qrUrl) {
        setQrisPayment({
          qrUrl,
          orderId: paymentOrderId || order.invoice_no || order.id,
          amount: order.total_price
        })
        return
      }

      throw new Error('QRIS tidak tersedia dari server pembayaran')
    } catch (error) {
      console.error('Midtrans payment error:', error)
      alert(error.response?.data?.message || error.message || 'Gagal membuat QRIS')
    }
  }

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

    const payload = {
      customer_id: form.customer_id,
      service_id: form.service_id,
      weight: Number(form.weight),
      total_price: calculatedTotal,
      status: form.status,
      payment_status: form.payment_status,
      payment_method: form.payment_method
    }

    const query = editingId
      ? supabase.from('orders').update(payload).eq('id', editingId)
      : supabase.from('orders').insert([{ ...payload, user_id: user.id, business_id: businessId, invoice_no: `INV-${Date.now().toString().slice(-6)}` }])
    const { data, error } = await query.select('*, customers(name, phone), services(name, unit, price)')

    setLoading(false)
    if (error) {
      alert(`${editingId ? 'Gagal mengubah' : 'Gagal membuat'} transaksi: ${error.message}`)
    } else {
      const savedOrder = data[0]
      setOrders(prev => editingId
        ? prev.map(order => order.id === editingId ? savedOrder : order)
        : [savedOrder, ...prev])
      resetForm()

      if (savedOrder.payment_method === 'qris' && savedOrder.payment_status === 'belum') {
        triggerMidtransPayment(savedOrder)
      } else {
        alert(editingId ? 'Transaksi berhasil diubah!' : 'Transaksi berhasil dibuat!')
      }
    }
  }

  const handleDelete = async (order) => {
    if (!confirm(`Hapus transaksi ${order.invoice_no || ''}? Data yang sudah dihapus tidak bisa dikembalikan.`)) return

    const { error } = await supabase.from('orders').delete().eq('id', order.id)
    if (error) {
      alert('Gagal menghapus transaksi: ' + error.message)
    } else {
      setOrders(prev => prev.filter(item => item.id !== order.id))
    }
  }

  // Handle Toggle Payment Status Manual
  const handleTogglePayment = async (o) => {
    const nextPayment = o.payment_status === 'lunas' ? 'belum' : 'lunas'
    const { error } = await supabase.from('orders').update({ payment_status: nextPayment }).eq('id', o.id)
    if (error) alert(error.message)
    else {
      setOrders(orders.map(item => item.id === o.id ? { ...item, payment_status: nextPayment } : item))
    }
  }

  const handleAdvanceStatus = async (order) => {
    if (role === 'kasir') {
      const nextKasirStatus = order.status === 'selesai' ? 'diambil' : null
      if (!nextKasirStatus) return
      const { error } = await supabase.from('orders').update({ status: nextKasirStatus }).eq('id', order.id)
      if (error) return alert(`Gagal mengubah status ke Diambil: ${error.message}`)
      setOrders(prev => prev.map(item => item.id === order.id ? { ...item, status: nextKasirStatus } : item))
      return
    }
    const currentIndex = Math.max(orderStatuses.findIndex(status => status.value === order.status), 0)
    const nextStatus = orderStatuses[currentIndex + 1]
    if (!nextStatus) return

    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus.value })
      .eq('id', order.id)

    if (error) return alert(`Gagal mengubah status ke ${nextStatus.label}: ${error.message}`)
    setOrders(prev => prev.map(item => item.id === order.id ? { ...item, status: nextStatus.value } : item))
  }

  // Direct Kirim Struk via WhatsApp
  const sendWhatsAppReceipt = (o) => {
    if (!o.customers?.phone) return alert('Nomor HP pelanggan tidak ditemukan!')
    
    let phone = o.customers.phone.trim()
    if (phone.startsWith('0')) phone = '62' + phone.slice(1)

    const text = `*RINSEY LAUNDRY - NOTA TRANSAKSI*\n` +
      `--------------------------------\n` +
      `No. Invoice : ${o.invoice_no || '-'}\n` +
      `Pelanggan   : ${o.customers?.name}\n` +
      `Layanan     : ${o.services?.name}\n` +
      `Jumlah/Berat: ${o.weight} ${o.services?.unit || 'kg'}\n` +
      `Metode Bayar: ${o.payment_method?.toUpperCase()}\n` +
      `Total Bayar : Rp ${o.total_price?.toLocaleString('id-ID')}\n` +
      `Status Bayar: ${o.payment_status?.toUpperCase()}\n` +
      `--------------------------------\n` +
      `Terima kasih telah mempercayakan cucian Anda di Rinsey Laundry! 🧺`

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  const filteredOrders = orders.filter(o =>
    (o.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.invoice_no?.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'semua' || o.status === statusFilter) &&
    (paymentFilter === 'semua' || o.payment_status === paymentFilter) &&
    (methodFilter === 'semua' || o.payment_method === methodFilter)
  )

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('semua')
    setPaymentFilter('semua')
    setMethodFilter('semua')
  }

  return (
    <div>
      {qrisPayment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qris-modal-title"
          onClick={() => setQrisPayment(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'rgba(15, 23, 42, 0.65)'
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(100%, 420px)',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              background: 'white',
              borderRadius: '20px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)'
            }}
          >
            <button
              type="button"
              aria-label="Tutup QRIS"
              onClick={() => setQrisPayment(null)}
              style={{ float: 'right', border: 'none', background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
            >
              ×
            </button>
            <h2 id="qris-modal-title" style={{ margin: '4px 0 8px', color: '#111827', fontSize: '22px' }}>QRIS Pembayaran Pelanggan</h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
              Minta pelanggan scan QR ini untuk membayar, atau simpan gambarnya untuk dikirim nanti.
            </p>
            <img
              src={qrisPayment.qrUrl}
              alt={`QRIS untuk ${qrisPayment.orderId}`}
              style={{ display: 'block', width: 'min(100%, 320px)', aspectRatio: '1', objectFit: 'contain', margin: '0 auto 16px', border: '1px solid #e2e8f0', borderRadius: '12px' }}
            />
            <div style={{ fontWeight: '800', fontSize: '18px', color: '#111827', marginBottom: '16px' }}>
              Rp {qrisPayment.amount.toLocaleString('id-ID')}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={qrisPayment.qrUrl}
                download={`qris-${qrisPayment.orderId}.png`}
                target="_blank"
                rel="noreferrer"
                style={{ background: '#4361EE', color: 'white', padding: '11px 16px', borderRadius: '10px', fontWeight: '700', textDecoration: 'none' }}
              >
                Download QRIS
              </a>
              <button
                type="button"
                onClick={() => setQrisPayment(null)}
                style={{ background: '#F1F5F9', color: '#334155', border: 'none', padding: '11px 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                Tutup
              </button>
            </div>
            <p style={{ margin: '14px 0 0', color: '#94a3b8', fontSize: '11px' }}>
              Jika tombol download tidak menyimpan otomatis di HP, buka gambarnya lalu tekan lama untuk menyimpan.
            </p>
          </div>
        </div>
      )}
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111' }}>Transaksi</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Kelola pesanan dan kasir laundry</p>
        </div>
        {can(role, 'transactionCreate') && <button
          onClick={() => showAdd ? resetForm() : setShowAdd(true)}
          style={{ background: '#4361EE', color: 'white', padding: '10px 18px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', border: 'none' }}
        >
          {showAdd ? 'Batal' : '+ Transaksi Baru'}
        </button>}
      </div>

      {/* FORM INPUT TRANSAKSI BARU */}
      {showAdd && can(role, 'transactionCreate') && (
        <form onSubmit={handleCreateOrder} style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #eef2f7', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>{editingId ? 'Edit Transaksi' : 'Buat Transaksi Baru'}</h3>

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

            {/* METODE PEMBAYARAN */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>METODE PEMBAYARAN</label>
              <select
                value={form.payment_method}
                onChange={e => setForm({ ...form, payment_method: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}
              >
                <option value="cash">Cash / Tunai</option>
                <option value="qris">QRIS (GoPay, OVO, ShopeePay, M-Banking)</option>
                <option value="transfer">Bank Transfer</option>
              </select>
            </div>

            {/* STATUS PESANAN */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>STATUS PESANAN</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}
              >
                {orderStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#64748b' }}>
                Alur: Masuk → Dicuci → Disetrika → Selesai → Diambil
              </p>
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
              {form.payment_method === 'qris' && (
                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#64748b' }}>
                  QRIS akan ditampilkan kepada pelanggan setelah transaksi dibuat.
                </p>
              )}
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
              {loading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      )}

      {/* SEARCH AND FILTERS */}
      <div style={{ background: 'white', padding: '14px', borderRadius: '16px', border: '1px solid #eef2f7', marginTop: '16px' }}>
        <input
          placeholder="Cari invoice atau nama pelanggan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginTop: '10px' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter status cucian" style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#334155', background: 'white' }}>
            <option value="semua">Semua status cucian</option>
            {orderStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} aria-label="Filter status pembayaran" style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#334155', background: 'white' }}>
            <option value="semua">Semua pembayaran</option>
            <option value="belum">Belum lunas</option>
            <option value="lunas">Lunas</option>
          </select>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} aria-label="Filter metode pembayaran" style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#334155', background: 'white' }}>
            <option value="semua">Semua metode</option>
            <option value="cash">Cash / Tunai</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Bank Transfer</option>
          </select>
          <button type="button" onClick={resetFilters} style={{ padding: '11px 12px', borderRadius: '10px', border: 'none', background: '#F1F5F9', color: '#334155', fontWeight: '700', cursor: 'pointer' }}>Reset Filter</button>
        </div>
        <div style={{ marginTop: '10px', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
          Menampilkan {filteredOrders.length} dari {orders.length} transaksi
        </div>
      </div>

      {/* DAFTAR TRANSAKSI TABLE / CARDS */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #eef2f7', color: '#64748b', textAlign: 'center' }}>
            Tidak ada transaksi yang sesuai filter.
          </div>
        ) : filteredOrders.map(o => (
          <div key={o.id} style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #eef2f7', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '800', fontSize: '15px', color: '#111' }}>{o.invoice_no || 'INV-000'}</span>
                <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                  {o.payment_method || 'CASH'}
                </span>
                {(() => {
                  const status = orderStatuses.find(item => item.value === o.status) || orderStatuses[0]
                  return <span style={{ background: status.background, color: status.color, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>{status.label}</span>
                })()}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>
                👤 {o.customers?.name || 'Pelanggan Umum'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                📦 {o.services?.name} • {o.weight} {o.services?.unit || 'kg'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#111' }}>
                Rp {o.total_price?.toLocaleString('id-ID')}
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                {can(role, 'qris') && o.payment_method === 'qris' && o.payment_status === 'belum' && (
                  <button
                    onClick={() => triggerMidtransPayment(o)}
                    title="Tampilkan QRIS agar pelanggan dapat membayar"
                    style={{ background: '#4361EE', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ▣ Tampilkan QRIS
                  </button>
                )}
                {can(role, 'payment') && <button
                  onClick={() => handleTogglePayment(o)}
                  style={{
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
                </button>}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', borderTop: '1px solid #f8fafc', paddingTop: '10px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {can(role, 'status') && o.status !== 'diambil' && (role !== 'kasir' || o.status === 'selesai') && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStatus(o)}
                    title="Pindahkan ke tahap berikutnya"
                    style={{ background: '#111827', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Pindahkan ke {role === 'kasir' ? 'Diambil' : orderStatuses[orderStatuses.findIndex(status => status.value === o.status) + 1]?.label || 'Berikutnya'} →
                  </button>
                )}
                {can(role, 'transactionEdit') && <button
                  onClick={() => handleOpenEdit(o)}
                  title="Edit transaksi"
                  style={{ background: '#F1F5F9', color: '#334155', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  ✏️ Edit
                </button>}
                {can(role, 'transactionDelete') && <button
                  onClick={() => handleDelete(o)}
                  title="Hapus transaksi"
                  style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                >
                  🗑 Hapus
                </button>}
              </div>
              {can(role, 'receipt') && <button
                onClick={() => sendWhatsAppReceipt(o)}
                style={{ background: '#25D366', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
              >
                💬 Kirim WA Struk
              </button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}