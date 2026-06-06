'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Produtos() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: ''
  })

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
        loadProducts(userData.tenant_id)
        loadCategories(userData.tenant_id)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  async function loadProducts(tid) {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('tenant_id', tid)
      .order('position')

    setProducts(data || [])
  }

  async function loadCategories(tid) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tid)
      .eq('active', true)

    setCategories(data || [])
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('products')
      .insert({
        tenant_id: tenantId,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category_id || null,
        image_url: form.image_url || null,
        position: products.length
      })

    if (error) {
      setError('Erro ao salvar: ' + error.message)
    } else {
      setForm({ name: '', description: '', price: '', category_id: '', image_url: '' })
      setShowForm(false)
      loadProducts(tenantId)
    }

    setSaving(false)
  }

  async function handleToggle(product) {
    await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id)

    loadProducts(tenantId)
  }

  async function handleDelete(id) {
    await supabase.from('products').delete().eq('id', id)
    loadProducts(tenantId)
  }

  if (loading) return <p style={{ padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Produtos</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/dashboard/categorias" style={{ color: '#666', padding: '8px 12px' }}>Categorias</a>
          <a href="/dashboard" style={{ color: '#666', padding: '8px 12px' }}>← Voltar</a>
        </div>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 24, padding: '10px 20px', background: '#FF6B00', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 6 }}
      >
        {showForm ? 'Cancelar' : '+ Novo Produto'}
      </button>

      {showForm && (
        <div style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Nome do produto *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
          />
          <textarea
            placeholder="Descrição"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8, height: 80 }}
          />
          <input
            type="number"
            placeholder="Preço *"
            value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
          />
          <select
            value={form.category_id}
            onChange={e => setForm({ ...form, category_id: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
          >
            <option value="">Sem categoria</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="URL da imagem (opcional)"
            value={form.image_url}
            onChange={e => setForm({ ...form, image_url: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
          />

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '10px 24px', background: '#FF6B00', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 6 }}
          >
            {saving ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </div>
      )}

      {products.length === 0 && (
        <p style={{ color: '#999' }}>Nenhum produto ainda. Adicione o primeiro!</p>
      )}

      {products.map(product => (
        <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {product.image_url && (
              <img src={product.image_url} alt={product.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} />
            )}
            <div>
              <strong style={{ color: product.active ? '#000' : '#999' }}>{product.name}</strong>
              <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{product.categories?.name}</p>
              <p style={{ margin: 0, fontSize: 14, color: '#FF6B00' }}>R$ {Number(product.price).toFixed(2)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleToggle(product)}
              style={{ padding: '4px 10px', background: product.active ? '#4CAF50' : '#ccc', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4 }}
            >
              {product.active ? 'Ativo' : 'Inativo'}
            </button>
            <button
              onClick={() => handleDelete(product.id)}
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