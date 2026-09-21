import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const roles = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'kasir', label: 'Kasir' },
  { value: 'staff', label: 'Staff' },
]

export default function TeamPage() {
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadMembers = async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase.rpc('get_business_team')
    if (loadError) setError(loadError.message)
    else setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    supabase.rpc('get_business_team').then(({ data, error: loadError }) => {
      if (cancelled) return
      if (loadError) setError(loadError.message)
      else setMembers(data || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const addMember = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const { error: addError } = await supabase.rpc('add_business_member_by_email', {
      p_email: email.trim(),
      p_role: role,
    })
    if (addError) setError(addError.message)
    else {
      setMessage('Anggota berhasil ditambahkan ke tim.')
      setEmail('')
      await loadMembers()
    }
    setSaving(false)
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111' }}>Kelola Tim</h1>
      <p style={{ color: '#64748b', marginTop: '4px' }}>
        Tambahkan akun yang sudah terdaftar ke bisnis ini. Undangan email akan tersedia setelah Edge Function diaktifkan.
      </p>

      <form onSubmit={addMember} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #eef2f7', marginTop: '24px' }}>
        <input required type="email" placeholder="Email akun yang sudah terdaftar" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: '1 1 260px', padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
        <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '11px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white' }}>
          {roles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button disabled={saving} type="submit" style={{ padding: '11px 16px', border: 0, borderRadius: '10px', background: '#111', color: 'white', fontWeight: '700', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Menambahkan...' : 'Tambah anggota'}
        </button>
      </form>
      {message && <p style={{ color: '#15803d', fontSize: '14px' }}>{message}</p>}
      {error && <p style={{ color: '#b91c1c', fontSize: '14px' }}>{error}</p>}

      <div style={{ background: 'white', border: '1px solid #eef2f7', borderRadius: '16px', marginTop: '16px', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '20px', color: '#64748b' }}>Memuat anggota...</p> : members.map(member => (
          <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <div><strong>{member.out_email}</strong><div style={{ color: '#64748b', fontSize: '13px' }}>{member.out_status === 'invited' ? 'Undangan' : 'Aktif'}</div></div>
            <span style={{ fontWeight: '700', textTransform: 'capitalize' }}>{member.out_role}</span>
          </div>
        ))}
        {!loading && members.length === 0 && <p style={{ padding: '20px', color: '#64748b' }}>Belum ada anggota.</p>}
      </div>
    </div>
  )
}
