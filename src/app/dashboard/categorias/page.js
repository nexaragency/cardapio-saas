'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Categorias() {
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [tenantId, setTenantId] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (userData) {
        setTenantId(userData.tenant_id)
        loadCategories(userData.tenant_id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadCategories(tid) {
    const { data } = await supabase
      .from('categories').select('*').eq('tenant_id', tid).order('position')
    setCategories(data || [])
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('categories').insert({ tenant_id: tenantId, name, position: categories.length })
    if (error) { setError('Erro ao salvar: ' + error.message) }
    else { setName(''); loadCategories(tenantId) }
    setSaving(false)
  }

  async function handleToggle(cat) {
    await supabase.from('categories').update({ active: !cat.active }).eq('id', cat.id)
    loadCategories(tenantId)
  }

  async function handleDelete(id) {
    await supabase.from('categories').delete().eq('id', id)
    loadCategories(tenantId)
  }

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Categorias</h1>
          <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Organize as seções do seu cardápio</p>
        </div>
        <a href="/dashboard" style={{ fontSize: 13, color: '#6C757D', textDecoration: 'none' }}>Voltar</a>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 12 }}>NOVA CATEGORIA</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Ex: Pizzas, Bebidas, Sobremesas"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, outline: 'none', color: '#1A1A2E' }}
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{ padding: '10px 20px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
        {error && <p style={{ color: '#e53935', fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>

      {categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhuma categoria ainda</div>
          <div style={{ fontSize: 13 }}>Adicione a primeira categoria acima</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categories.map((cat) => (
          <div key={cat.id} style={{
            background: '#fff', border: '1px solid #E9ECEF',
            borderRadius: 12, padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: cat.active ? '#00B894' : '#dee2e6'
              }} />
              <span style={{
                fontSize: 14, fontWeight: 500,
                color: cat.active ? '#1A1A2E' : '#adb5bd',
                textDecoration: cat.active ? 'none' : 'line-through'
              }}>
                {cat.name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleToggle(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: cat.active ? '#E8F8F5' : '#F8F9FA',
                  color: cat.active ? '#00B894' : '#6C757D'
                }}
              >
                {cat.active ? 'Ativa' : 'Inativa'}
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: '#FFF5F5', color: '#e53935'
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}