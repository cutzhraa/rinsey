import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const emptyForm = { business_name: '', whatsapp: '', address: '', opening_hours: '08.00 - 20.00' }

export default function Onboarding() {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/login', { replace: true })
      const { data, error } = await supabase.from('business_profiles').select('*').eq('user_id', user.id).maybeSingle()
      if (error) {
        console.error('Gagal memuat profil bisnis:', error)
        alert('Tabel profil bisnis belum tersedia. Jalankan migration business_profiles di Supabase.')
      } else if (data) {
        setForm({ business_name: data.business_name || '', whatsapp: data.whatsapp || '', address: data.address || '', opening_hours: data.opening_hours || '' })
      }
      setLoading(false)
    }
    loadProfile()
  }, [navigate])

  const handleSubmit = async event => {
    event.preventDefault()
    if (!form.business_name.trim()) return alert('Nama laundry wajib diisi.')
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return navigate('/login', { replace: true })
    const { error } = await supabase.from('business_profiles').upsert({ ...form, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) return alert('Gagal menyimpan profil: ' + error.message)
    navigate('/', { replace: true })
  }

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Memuat profil bisnis...</div>

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', background: '#f8fafc' }}>
      <form onSubmit={handleSubmit} style={{ width: 'min(560px, 100%)', background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #eef2f7', boxShadow: '0 12px 35px rgba(15,23,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
          <img src="/rinsey.jpg" alt="Rinsey" style={{ width: '52px', height: '52px', borderRadius: '15px', objectFit: 'cover' }} />
          <div><h1 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Profil Laundry</h1><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Data ini akan tampil di aplikasi dan struk.</p></div>
        </div>
        {[
          ['business_name', 'NAMA LAUNDRY', 'Contoh: Laundry Mawar', true],
          ['whatsapp', 'NOMOR WHATSAPP', 'Contoh: 08123456789', false],
          ['address', 'ALAMAT LAUNDRY', 'Contoh: Jl. Melati No. 10', false],
          ['opening_hours', 'JAM OPERASIONAL', 'Contoh: 08.00 - 20.00', false]
        ].map(([key, label, placeholder, required]) => (
          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
            {label}
            <input value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} required={required} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#111827', fontSize: '14px' }} />
          </label>
        ))}
        <button type="submit" disabled={saving} style={{ width: '100%', marginTop: '22px', padding: '13px', border: 'none', borderRadius: '11px', background: '#111827', color: 'white', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Menyimpan...' : 'Simpan dan Masuk Dashboard'}
        </button>
      </form>
    </div>
  )
}
