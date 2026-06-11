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
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [variations, setVariations] = useState([])
  const [newVariation, setNewVariation] = useState({ name: '', price: '' })
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
      .from('products')
      .select('*, categories(name), product_variations(*)')
      .eq('tenant_id', tid)
      .order('position')
    setProducts(data || [])
  }

  async function loadCategories(tid) {
    const { data } = await supabase
      .from('categories').select('*')
      .eq('tenant_id', tid)
      .eq('active', true)
      .eq('is_addon', false)
    setCategories(data || [])
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file) {
    const ext = file.name.split('.').pop()
    const filename = Date.now() + '.' + ext
    const { error } = await supabase.storage.from('produtos').upload(filename, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('produtos').getPublicUrl(filename)
    return data.publicUrl
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
    setImagePreview(product.image_url || null)
    setImageFile(null)
    setVariations(product.product_variations || [])
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setImageFile(null)
    setImagePreview(null)
    setVariations([])
    setNewVariation({ name: '', price: '' })
    setForm({ name: '', description: '', price: '', category_id: '', image_url: '' })
    setError('')
  }

  function addVariation() {
    if (!newVariation.name.trim() || !newVariation.price) return
    setVariations(prev => [...prev, { ...newVariation, temp: true, id: Date.now().toString() }])
    setNewVariation({ name: '', price: '' })
  }

  function removeVariation(id) {
    setVariations(prev => prev.filter(v => v.id !== id))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    if (variations.length === 0 && !form.price) return
    setSaving(true)
    setError('')

    let imageUrl = form.image_url
    if (imageFile) {
      const uploaded = await uploadImage(imageFile)
      if (uploaded) imageUrl = uploaded
    }

    const productData = {
      tenant_id: tenantId,
      name: form.name,
      description: form.description,
      price: variations.length > 0 ? Math.min(...variations.map(v => parseFloat(v.price))) : parseFloat(form.price),
      category_id: form.category_id || null,
      image_url: imageUrl || null,
      position: editingId ? undefined : products.length
    }

    let productId = editingId

    if (editingId) {
      const { error } = await supabase.from('products').update(productData).eq('id', editingId)
      if (error) { setError('Erro ao atualizar: ' + error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('products').insert(productData).select().single()
      if (error) { setError('Erro ao salvar: ' + error.message); setSaving(false); return }
      productId = data.id
    }

    await supabase.from('product_variations').delete().eq('product_id', productId)
    if (variations.length > 0) {
      await supabase.from('product_variations').insert(
        variations.map((v, i) => ({
          product_id: productId,
          name: v.name,
          price: parseFloat(v.price),
          position: i
        }))
      )
    }

    handleCancel()
    loadProducts(tenantId)
    setSaving(false)
  }

  async function handleToggle(product) {
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
    loadProducts(tenantId)
  }

  async function handleFeatured(product) {
    await supabase.from('products').update({ featured: !product.featured }).eq('id', product.id)
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
          <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>{products.length + ' produto(s) cadastrado(s)'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="/dashboard/categorias" style={{ fontSize: 13, color: '#6C757D', textDecoration: 'none' }}>Categorias</a>
          <button onClick={() => showForm ? handleCancel() : setShowForm(true)}
            style={{ padding: '9px 18px', background: showForm ? '#F8F9FA' : '#00B894', color: showForm ? '#6C757D' : '#fff', border: showForm ? '1px solid #E9ECEF' : 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
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
            <input type="text" placeholder="Nome do produto *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }} />
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}>
              <option value="">Sem categoria</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <textarea placeholder="Descrição do produto" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', height: 80, resize: 'none', marginBottom: 12, boxSizing: 'border-box' }} />

          <div style={{ background: '#F8F9FA', borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 12 }}>TAMANHOS E PREÇOS</div>
            <p style={{ fontSize: 12, color: '#6C757D', margin: '0 0 12px' }}>
              Se adicionar tamanhos, o preço fixo será ignorado. O menor preço aparece como "A partir de".
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="text" placeholder="Tamanho (Ex: P, M, G, Família)"
                value={newVariation.name}
                onChange={e => setNewVariation({ ...newVariation, name: e.target.value })}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, color: '#1A1A2E', outline: 'none' }} />
              <input type="number" placeholder="Preço"
                value={newVariation.price}
                onChange={e => setNewVariation({ ...newVariation, price: e.target.value })}
                style={{ width: 100, padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, color: '#1A1A2E', outline: 'none' }} />
              <button onClick={addVariation}
                style={{ padding: '8px 16px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Adicionar
              </button>
            </div>

            {variations.map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 8, marginBottom: 6, border: '1px solid #E9ECEF' }}>
                <span style={{ fontSize: 13, color: '#1A1A2E', fontWeight: 500 }}>{v.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#00B894', fontWeight: 700 }}>R$ {Number(v.price).toFixed(2)}</span>
                  <button onClick={() => removeVariation(v.id)}
                    style={{ padding: '3px 8px', background: '#FFF5F5', color: '#e53935', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    Remover
                  </button>
                </div>
              </div>
            ))}

            {variations.length === 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 8 }}>OU PREÇO ÚNICO</div>
                <input type="number" placeholder="Preço fixo *" value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 8 }}>FOTO DO PRODUTO</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: '2px dashed #E9ECEF', cursor: 'pointer', background: '#F8F9FA' }}>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: 56, height: 56, background: '#E9ECEF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>+</div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>
                  {imagePreview ? 'Clique para trocar a foto' : 'Clique para adicionar foto'}
                </div>
                <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>JPG, PNG ou WEBP</div>
              </div>
            </label>
          </div>

          {error && <p style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 24px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar Produto' : 'Salvar Produto'}
            </button>
            <button onClick={handleCancel}
              style={{ padding: '10px 24px', background: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {products.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🍽️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum produto ainda</div>
          <div style={{ fontSize: 13 }}>Clique em Novo Produto para começar</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products.map(product => {
          const minPrice = product.product_variations?.length > 0
            ? Math.min(...product.product_variations.map(v => Number(v.price)))
            : null
          return (
            <div key={product.id} style={{ background: '#fff', border: editingId === product.id ? '1px solid #00B894' : '1px solid #E9ECEF', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: '#F8F9FA', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
                    SEM FOTO
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: product.active ? '#1A1A2E' : '#adb5bd' }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
                    {product.categories ? product.categories.name : 'Sem categoria'}
                    {product.product_variations?.length > 0 && ' · ' + product.product_variations.length + ' tamanho(s)'}
                  </div>
                  <div style={{ fontSize: 13, color: '#00B894', fontWeight: 700, marginTop: 4 }}>
                    {minPrice !== null ? 'A partir de R$ ' + minPrice.toFixed(2) : 'R$ ' + Number(product.price).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => handleFeatured(product)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: product.featured ? '#FFF8E8' : '#F8F9FA', color: product.featured ? '#B8860B' : '#adb5bd' }}>
                  {product.featured ? '⭐ Destaque' : 'Destaque'}
                </button>
                <button onClick={() => handleEdit(product)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#F0F4FF', color: '#4A6CF7' }}>
                  Editar
                </button>
                <button onClick={() => handleToggle(product)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: product.active ? '#E8F8F5' : '#F8F9FA', color: product.active ? '#00B894' : '#6C757D' }}>
                  {product.active ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => handleDelete(product.id)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#FFF5F5', color: '#e53935' }}>
                  Excluir
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}