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
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '' })

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
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
      .from('products').select('*, categories(name)').eq('tenant_id', tid).order('position')
    setProducts(data || [])
  }

  async function loadCategories(tid) {
    const { data } = await supabase
      .from('categories').select('*').eq('tenant_id', tid).eq('active', true)
    setCategories(data || [])
  }

  function handleEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category_id: product.category_id || '',
      image_url: product.image_url || ''
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', description: '', price: '', category_id: '', image_url: '' })
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    setError('')

    if (editingId) {
      const { error } = await supabase.from('products').update({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category_id || null,
        image_url: form.image_url || null,
      }).eq('id', editingId)
      if (error) { setError('Erro ao atualizar: ' + error.message) }
      else { handleCancel(); loadProducts(tenantId) }
    } else {
      const { error } = await supabase.from('products').insert({
        tenant_id: tenantId,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category_id || null,
        image_url: form.image_url || null,
        position: products.length
      })
      if (error) { setError('Erro ao salvar: ' + error.message) }
      else { handleCancel(); loadProducts(tenantId) }
    }

    setSaving(false)
  }

  async function handleToggle(product) {
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    loadProducts(tenantId)
  }

  async function handleDelete(id) {
    await supabase.from('products').delete().eq('id', id)
    loadProducts(tenantId)
  }

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Produtos</h1>
          <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>
            {products.length + ' produto(s) cadastrado(s)'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/dashboard/categorias" style={{ fontSize: 13, color: '#6C757D', textDecoration: 'none' }}>Categorias</a>
          <button
            onClick={() => showForm ? handleCancel() : setShowForm(true)}
            style={{
              padding: '9px 18px', background: showForm ? '#F8F9FA' : '#00B894',
              color: showForm ? '#6C757D' : '#fff',
              border: showForm ? '1px solid #E9ECEF' : 'none',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}
          >
            {showForm ? 'Cancelar' : '+ Novo Produto'}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>
            {editingId ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Nome do produto *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
            />
            <input
              type="number"
              placeholder="Preco *"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
            />
          </div>
          <textarea
            placeholder="Descricao do produto"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', height: 80, resize: 'none', marginBottom: 12, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <select
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
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
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
            />
          </div>
          {error && <p style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 24px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              {saving ? 'Salvando...' : editingId ? 'Atualizar Produto' : 'Salvar Produto'}
            </button>
            <button
              onClick={handleCancel}
              style={{ padding: '10px 24px', background: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {products.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum produto ainda</div>
          <div style={{ fontSize: 13 }}>Clique em Novo Produto para comecar</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products.map((product) => (
          <div key={product.id} style={{
            background: '#fff', border: editingId === product.id ? '1px solid #00B894' : '1px solid #E9ECEF',
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: 48, height: 48, background: '#F8F9FA', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd', fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                  SEM FOTO
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: product.active ? '#1A1A2E' : '#adb5bd' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
                  {product.categories ? product.categories.name : 'Sem categoria'}
                </div>
                <div style={{ fontSize: 13, color: '#00B894', fontWeight: 700, marginTop: 4 }}>
                  {'R$ ' + Number(product.price).toFixed(2)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleEdit(product)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: '#F0F4FF', color: '#4A6CF7'
                }}
              >
                Editar
              </button>
              <button
                onClick={() => handleToggle(product)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: product.active ? '#E8F8F5' : '#F8F9FA',
                  color: product.active ? '#00B894' : '#6C757D'
                }}
              >
                {product.active ? 'Ativo' : 'Inativo'}
              </button>
              <button
                onClick={() => handleDelete(product.id)}
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