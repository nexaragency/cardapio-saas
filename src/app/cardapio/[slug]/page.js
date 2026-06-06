'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CardapioPublico({ params }) {
  const { slug } = params
  const [tenant, setTenant] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: tenantData } = await supabase
        .from('tenants').select('*').eq('slug', slug).single()
      if (!tenantData) { setLoading(false); return }
      setTenant(tenantData)

      const { data: cats } = await supabase
        .from('categories').select('*')
        .eq('tenant_id', tenantData.id).eq('active', true).order('position')
      setCategories(cats || [])
      if (cats && cats.length > 0) setActiveCategory(cats[0].id)

      const { data: prods } = await supabase
        .from('products').select('*, categories(name)')
        .eq('tenant_id', tenantData.id).eq('active', true).order('position')
      setProducts(prods || [])

      setLoading(false)
    }
    loadData()
  }, [slug])

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  function removeFromCart(id) {
    setCart(prev => {
      const existing = prev.find(i => i.id === id)
      if (existing.qty === 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i)
    })
  }

  function getQty(id) {
    return cart.find(i => i.id === id)?.qty || 0
  }

  function getTotal() {
    return cart.reduce((sum, i) => sum + (i.price * i.qty), 0)
  }

  function getTotalItems() {
    return cart.reduce((sum, i) => sum + i.qty, 0)
  }

  function sendWhatsApp() {
    if (!customerName.trim()) { alert('Por favor, informe seu nome.'); return }
    const lines = cart.map(i => i.qty + 'x ' + i.name + ' - R$ ' + (i.price * i.qty).toFixed(2))
    const msg = 'Ola! Meu nome e ' + customerName + '.\n\nPedido:\n' + lines.join('\n') + '\n\nTotal: R$ ' + getTotal().toFixed(2)
    const phone = tenant.phone ? tenant.phone.replace(/\D/g, '') : ''
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank')
  }

  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Carregando cardapio...</p>
    </div>
  )

  if (!tenant) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Cardapio nao encontrado.</p>
    </div>
  )

  return (
    <div style={{ background: '#F8F9FA', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif', paddingBottom: 100 }}>

      {/* HEADER */}
      <div style={{ background: '#00B894', padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, fontWeight: 700, color: '#fff' }}>
          {tenant.name.charAt(0)}
        </div>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{tenant.name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>Cardapio Digital</p>
      </div>

      {/* CATEGORIAS */}
      {categories.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid #E9ECEF', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto', position: 'sticky', top: 0, zIndex: 10 }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '14px 16px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                color: activeCategory === cat.id ? '#00B894' : '#6C757D',
                borderBottom: activeCategory === cat.id ? '2px solid #00B894' : '2px solid transparent'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* PRODUTOS */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>
        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🍽️</div>
            <div>Nenhum produto nesta categoria</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredProducts.map(product => {
            const qty = getQty(product.id)
            return (
              <div key={product.id} style={{
                background: '#fff', borderRadius: 12,
                border: '1px solid #E9ECEF',
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '14px 16px', gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E', marginBottom: 4 }}>{product.name}</div>
                  {product.description && (
                    <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 6 }}>{product.description}</div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#00B894' }}>
                    {'R$ ' + Number(product.price).toFixed(2)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />
                  )}
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(product)}
                      style={{ padding: '6px 16px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      Adicionar
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => removeFromCart(product.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E9ECEF', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>{qty}</span>
                      <button onClick={() => addToCart(product)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#00B894', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BOTAO CARRINHO */}
      {cart.length > 0 && !showCart && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
          <button
            onClick={() => setShowCart(true)}
            style={{
              background: '#00B894', color: '#fff', border: 'none',
              borderRadius: 30, padding: '14px 32px', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px rgba(0,184,148,0.4)',
              display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
              {getTotalItems()}
            </span>
            Ver pedido — R$ {getTotal().toFixed(2)}
          </button>
        </div>
      )}

      {/* CARRINHO */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>Seu Pedido</h2>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6C757D' }}>x</button>
            </div>

            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #E9ECEF' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: '#6C757D', marginTop: 2 }}>{'R$ ' + Number(item.price).toFixed(2) + ' cada'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => removeFromCart(item.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E9ECEF', background: '#fff', cursor: 'pointer', fontSize: 16 }}>-</button>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{item.qty}</span>
                  <button onClick={() => addToCart(item)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#00B894', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>+</button>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#00B894', minWidth: 70, textAlign: 'right' }}>{'R$ ' + (item.price * item.qty).toFixed(2)}</span>
                </div>
              </div>
            ))}

            <div style={{ padding: '16px 0', borderBottom: '1px solid #E9ECEF', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: '#1A1A2E' }}>
                <span>Total</span>
                <span style={{ color: '#00B894' }}>{'R$ ' + getTotal().toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Seu nome *"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
              />
              <input
                type="tel"
                placeholder="Seu telefone (opcional)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                style={{ display: 'block', width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={sendWhatsApp}
              style={{ width: '100%', padding: '14px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
            >
              Enviar pedido pelo WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}