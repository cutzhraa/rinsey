import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { type: 'expense', category: 'Operasional', description: '', amount: '', transaction_date: new Date().toISOString().slice(0, 10) }

export default function KeuanganPage() {
  const [entries, setEntries] = useState([])
  const [paidOrders, setPaidOrders] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [{ data: transactions, error: transactionError }, { data: orders, error: orderError }] = await Promise.all([
      supabase.from('financial_transactions').select('*').order('transaction_date', { ascending: false }),
      supabase.from('orders').select('id, invoice_no, total_price, created_at').eq('payment_status', 'lunas').order('created_at', { ascending: false })
    ])
    if (transactionError || orderError) {
      console.error('Gagal memuat data keuangan:', transactionError || orderError)
      alert('Gagal memuat data keuangan. Pastikan migration Keuangan + Stok sudah dijalankan di Supabase.')
    }
    setEntries(transactions || [])
    setPaidOrders(orders || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const totals = useMemo(() => {
    const orderIncome = paidOrders.reduce((sum, order) => sum + Number(order.total_price || 0), 0)
    const manualIncome = entries.filter(entry => entry.type === 'income').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    const expenses = entries.filter(entry => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    return { income: orderIncome + manualIncome, expenses, profit: orderIncome + manualIncome - expenses }
  }, [entries, paidOrders])

  const handleSubmit = async event => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.category || !amount || amount <= 0) return alert('Kategori dan nominal wajib diisi.')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Sesi login berakhir. Silakan login ulang.')

    const { data, error } = await supabase.from('financial_transactions').insert([{ ...form, user_id: user.id, amount }]).select()
    if (error) return alert('Gagal menyimpan catatan: ' + error.message)
    setEntries(prev => [data[0], ...prev])
    setForm(emptyForm)
    setShowForm(false)
  }

  const handleDelete = async entry => {
    if (!confirm(`Hapus catatan ${entry.category}?`)) return
    const { error } = await supabase.from('financial_transactions').delete().eq('id', entry.id)
    if (error) return alert('Gagal menghapus catatan: ' + error.message)
    setEntries(prev => prev.filter(item => item.id !== entry.id))
  }

  if (loading) return <div style={{ color: '#64748b' }}>Memuat keuangan...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111' }}>Keuangan</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Pantau pemasukan, pengeluaran, dan laba laundry</p>
        </div>
        <button onClick={() => setShowForm(value => !value)} style={{ background: '#4361EE', color: 'white', padding: '10px 18px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
          {showForm ? 'Batal' : '+ Catat Keuangan'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginTop: '24px' }}>
        {[
          ['PEMASUKAN', totals.income, '#06D6A0'],
          ['PENGELUARAN', totals.expenses, '#FF6B6B'],
          ['LABA BERSIH', totals.profit, '#4361EE']
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: 'white', padding: '18px', borderRadius: '16px', border: '1px solid #eef2f7' }}>
            <small style={{ color: '#94a3b8', fontWeight: '700', fontSize: '10px', letterSpacing: '1px' }}>{label}</small>
            <h2 style={{ color, margin: '8px 0 0', fontSize: '22px' }}>Rp {value.toLocaleString('id-ID')}</h2>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'white', padding: '18px', borderRadius: '16px', border: '1px solid #eef2f7', marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
          <select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan lain</option>
          </select>
          <input placeholder="Kategori (contoh: Deterjen)" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <input placeholder="Keterangan (opsional)" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <input type="number" min="1" placeholder="Nominal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <input type="date" value={form.transaction_date} onChange={event => setForm({ ...form, transaction_date: event.target.value })} required style={{ padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
          <button type="submit" style={{ background: '#111', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Simpan Catatan</button>
        </form>
      )}

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #eef2f7', marginTop: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: '800' }}>Catatan Manual</div>
        {entries.length === 0 ? <p style={{ padding: '18px', color: '#94a3b8' }}>Belum ada catatan manual.</p> : entries.map(entry => (
          <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid #f8fafc' }}>
            <div><b>{entry.category}</b><div style={{ color: '#64748b', fontSize: '12px' }}>{entry.transaction_date} {entry.description && `• ${entry.description}`}</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><b style={{ color: entry.type === 'income' ? '#059669' : '#DC2626' }}>{entry.type === 'income' ? '+' : '-'} Rp {Number(entry.amount).toLocaleString('id-ID')}</b><button onClick={() => handleDelete(entry)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', padding: '6px 9px', cursor: 'pointer' }}>Hapus</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}
