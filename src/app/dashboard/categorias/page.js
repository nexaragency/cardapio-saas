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

      if (!user) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

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
      .from('categories')
      .select('*')
      .eq('tenant_id', tid)
      .order('position')

    setCategories(data || [])
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('categories')
      .insert({ tenant_id: tenantId, name, position: categories.length })

    if (error) {
      setError('Erro ao salvar: ' + error.message)
    } else {
      setName('')
      loadCategories(tenantId)
    }

    setSaving(false)
  }

  async function handleToggle(cat) {
    await supabase
      .from('categories')
      .update({ active: !cat.active })
      .eq('id', cat.id)

    loadCategories(tenantId)
  }

  async function handleDelete(id) {
    await supabase.from('categories').delete().eq('id', id)
    loadCategories(tenantId)
  }

  if (loading) return <p style={{ padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Categorias</h1>
        <a href="/dashboard" style={{ color: '#666' }}>← Voltar</a>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Nome da categoria"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          style={{ padding: '8px 16px', background: '#FF6B00', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {saving ? 'Salvando...' : 'Adicionar'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {categories.length === 0 && (
        <p style={{ color: '#999' }}>Nenhuma categoria ainda. Adicione a primeira!</p>
      )}

      {categories.map(cat => (
        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 8 }}>
          <span style={{ textDecoration: cat.active ? 'none' : 'line-through', color: cat.active ? '#000' : '#999' }}>
            {cat.name}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleToggle(cat)}
              style={{ padding: '4px 10px', background: cat.active ? '#4CAF50' : '#ccc', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              {cat.active ? 'Ativa' : 'Inativa'}
            </button>
            <button
              onClick={() => handleDelete(cat.id)}
              style={{ padding: '4px 10px', background: '#e53935', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}