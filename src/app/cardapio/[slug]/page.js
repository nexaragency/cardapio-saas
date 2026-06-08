'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_FLOW = ['novo', 'impresso', 'em_preparo', 'saiu_entrega', 'entregue']
const STATUS_LABEL = {
  novo: 'Pedido recebido',
  impresso: 'Pedido confirmado',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega!',
  entregue: 'Entregue!'
}
const STATUS_DESC = {
  novo: 'Aguardando confirmação do restaurante',
  impresso: 'O restaurante confirmou seu pedido',
  em_preparo: 'Seu pedido está sendo preparado',
  saiu_entrega: 'O motoboy está a caminho!',
  entregue: 'Pedido entregue. Bom apetite!'
}

export default function CardapioPublico({ params }) {
  const { slug } = use(params)
  const [tenant, setTenant] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [zones, setZones] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [step, setStep] = useState('menu')
  const [submitting, setSubmitting] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [tableNumber, setTableNumber] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [form, setForm] = useState({
    name: '', phone: '', address: '', neighborhood: '', city: '',
    payment_method: 'dinheiro', change_for: ''
  })
  const [deliveryFee, setDeliveryFee] = useState(null)
  const [neighborhoodError, setNeighborhoodError] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: tenantData } = await supabase
        .from('tenants').select('*').eq('slug', slug).single()
      if (!tenantData) { setLoading(false); return }
      setTenant(tenantData)

      if (tenantData.open_time && tenantData.close_time) {
        const now = new Date()
        const current = now.getHours() * 60 + now.getMinutes()
        const [oh, om] = tenantData.open_time.split(':').map(Number)
        const [ch, cm] = tenantData.close_time.split(':').map(Number)
        const open = oh * 60 + om
        const close = ch * 60 + cm
        setIsOpen(current >= open && current <= close)
      }

      const { data: cats } = await supabase
        .from('categories').select('*')
        .eq('tenant_id', tenantData.id).eq('active', true).order('position')
      setCategories(cats || [])
      if (cats && cats.length > 0) setActiveCategory(cats[0].id)

      const { data: prods } = await supabase
        .from('products').select('*, categories(name)')
        .eq('tenant_id', tenantData.id).eq('active', true).order('position')
      setProducts(prods || [])

      const { data: zns } = await supabase
        .from('delivery_zones').select('*')
        .eq('tenant_id', tenantData.id).eq('active', true)
      setZones(zns || [])

      const urlParams = new URLSearchParams(window.location.search)
      const mesa = urlParams.get('mesa')
      if (mesa) setTableNumber(mesa)

      const savedOrderId = localStorage.getItem('order_' + slug)
      if (savedOrderId) {
        const { data: savedOrder } = await supabase
          .from('orders').select('*, order_items(*)')
          .eq('id', savedOrderId).single()
        if (savedOrder && savedOrder.status !== 'entregue') {
          setCurrentOrder(savedOrder)
          setStep('tracking')
        }
      }

      setLoading(false)
    }
    loadData()
  }, [slug])

  useEffect(() => {
    if (!currentOrder) return
    if (Notification.permission === 'default') Notification.requestPermission()

    const channel = supabase
      .channel('order_' + currentOrder.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: 'id=eq.' + currentOrder.id
      }, payload => {
        const updated = payload.new
        setCurrentOrder(prev => ({ ...prev, ...updated }))
        if (updated.status === 'saiu_entrega' && Notification.permission === 'granted') {
          new Notification('Seu pedido saiu para entrega!', { body: 'O motoboy está a caminho!' })
        }
        if (updated.status === 'entregue') localStorage.removeItem('order_' + slug)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentOrder?.id])

  async function lookupCustomer(phone) {
    if (!phone || phone.length < 8 || !tenant) return
    const { data } = await supabase
      .from('customers').select('*')
      .eq('tenant_id', tenant.id).eq('phone', phone).single()
    if (data) {
      setForm(prev => ({ ...prev, name: data.name || prev.name, address: data.address || prev.address, neighborhood: data.neighborhood || prev.neighborhood, city: data.city || prev.city }))
      if (data.neighborhood) checkDeliveryFee(data.neighborhood)
    }
  }

  function checkDeliveryFee(neighborhood) {
    if (!neighborhood.trim()) { setDeliveryFee(null); setNeighborhoodError(''); return }
    const zone = zones.find(z => z.neighborhood.toLowerCase().trim() === neighborhood.toLowerCase().trim())
    if (zone) { setDeliveryFee(zone.fee); setNeighborhoodError('') }
    else { setDeliveryFee(null); setNeighborhoodError('Bairro fora da área de entrega') }
  }

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
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

  function getQty(id) { return cart.find(i => i.id === id)?.qty || 0 }
  function getSubtotal() { return cart.reduce((sum, i) => sum + (i.price * i.qty), 0) }
  function getTotal() { return getSubtotal() + (deliveryFee || 0) }
  function getTotalItems() { return cart.reduce((sum, i) => sum + i.qty, 0) }

  async function handleSubmitOrder() {
    if (!tableNumber) {
      if (!form.name.trim()) { alert('Informe seu nome'); return }
      if (!form.phone.trim()) { alert('Informe seu telefone'); return }
      if (!form.address.trim()) { alert('Informe seu endereço'); return }
      if (!form.neighborhood.trim()) { alert('Informe seu bairro'); return }
      if (neighborhoodError) { alert('Bairro fora da área de entrega'); return }
      if (deliveryFee === null) { alert('Informe um bairro válido'); return }
    }

    setSubmitting(true)

    const { data: order, error: orderError } = await supabase
      .from('orders').insert({
        tenant_id: tenant.id,
        customer_name: tableNumber ? 'Mesa ' + tableNumber : form.name,
        customer_phone: form.phone || null,
        customer_address: form.address || null,
        neighborhood: form.neighborhood || null,
        city: form.city || null,
        payment_method: form.payment_method,
        change_for: form.change_for ? parseFloat(form.change_for) : null,
        delivery_fee: tableNumber ? 0 : (deliveryFee || 0),
        total: tableNumber ? getSubtotal() : getTotal(),
        status: 'novo',
        table_number: tableNumber ? parseInt(tableNumber) : null,
        order_type: tableNumber ? 'salao' : 'delivery'
      }).select().single()

    if (orderError) { alert('Erro ao fazer pedido. Tente novamente.'); setSubmitting(false); return }

    await supabase.from('order_items').insert(
      cart.map(i => ({
        order_id: order.id, product_id: i.id, product_name: i.name,
        quantity: i.qty, unit_price: i.price, subtotal: i.price * i.qty
      }))
    )

    if (!tableNumber) {
      await supabase.from('customers').upsert({
        tenant_id: tenant.id, name: form.name, phone: form.phone,
        address: form.address, neighborhood: form.neighborhood, city: form.city
      }, { onConflict: 'tenant_id,phone' })
    }

    localStorage.setItem('order_' + slug, order.id)
    const { data: fullOrder } = await supabase.from('orders').select('*, order_items(*)').eq('id', order.id).single()
    setCurrentOrder(fullOrder)
    setCart([])
    setSubmitting(false)
    setStep('tracking')
  }

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory ? p.category_id === activeCategory : true
    const matchSearch = searchTerm ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
    return matchCategory && matchSearch
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Carregando cardápio...</p>
    </div>
  )

  if (!tenant) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Cardápio não encontrado.</p>
    </div>
  )

  if (step === 'tracking' && currentOrder) {
    const statusIndex = STATUS_FLOW.indexOf(currentOrder.status)
    const isDelivered = currentOrder.status === 'entregue'

    return (
      <div style={{ background: '#F8F9FA', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ background: '#00B894', padding: '28px 20px 20px', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{tenant.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>
            {tableNumber ? 'Mesa ' + tableNumber + ' — ' : ''}Pedido #{currentOrder.id.slice(-6).toUpperCase()}
          </p>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 28, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {currentOrder.status === 'novo' ? '🕐' : currentOrder.status === 'impresso' ? '✅' : currentOrder.status === 'em_preparo' ? '👨‍🍳' : currentOrder.status === 'saiu_entrega' ? '🛵' : '🎉'}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: '0 0 8px' }}>{STATUS_LABEL[currentOrder.status]}</h2>
            <p style={{ color: '#6C757D', fontSize: 14, margin: 0 }}>{STATUS_DESC[currentOrder.status]}</p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ height: 4, background: '#E9ECEF', borderRadius: 2, marginBottom: 12 }}>
              <div style={{ height: 4, background: '#00B894', borderRadius: 2, width: (statusIndex / (STATUS_FLOW.length - 1) * 100) + '%', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {STATUS_FLOW.map((s, i) => (
                <div key={s} style={{ width: 24, height: 24, borderRadius: '50%', background: i <= statusIndex ? '#00B894' : '#E9ECEF', color: i <= statusIndex ? '#fff' : '#adb5bd', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i < statusIndex ? '✓' : i + 1}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 12 }}>RESUMO</div>
            {currentOrder.order_items && currentOrder.order_items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: '#1A1A2E' }}>{item.quantity}x {item.product_name}</span>
                <span style={{ fontWeight: 600, color: '#1A1A2E' }}>R$ {Number(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #E9ECEF', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: '#00B894' }}>R$ {Number(currentOrder.total).toFixed(2)}</span>
            </div>
          </div>

          {isDelivered ? (
            <button onClick={() => { setStep('menu'); setCurrentOrder(null); localStorage.removeItem('order_' + slug) }}
              style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              Fazer novo pedido
            </button>
          ) : (
            <p style={{ textAlign: 'center', color: '#adb5bd', fontSize: 12, margin: 0 }}>Atualizando automaticamente...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#F8F9FA', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* BANNER */}
      {tenant.banner_url && (
        <div style={{ width: '100%', height: 220, overflow: 'hidden', position: 'relative' }}>
          <img src={tenant.banner_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* HEADER DO RESTAURANTE */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E9ECEF', padding: '16px 20px 0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 72, height: 72, background: '#00B894', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700, flexShrink: 0, border: '3px solid #fff', marginTop: tenant.banner_url ? -36 : 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              {tenant.name.charAt(0)}
            </div>
            <div style={{ flex: 1, paddingTop: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>{tenant.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isOpen ? '#00B894' : '#e53935' }}>
                  {isOpen ? '● Aberto' : '● Fechado'}
                </span>
                {tenant.open_time && tenant.close_time && (
                  <span style={{ fontSize: 12, color: '#6C757D' }}>
                    {'Funciona das ' + tenant.open_time.slice(0, 5) + ' às ' + tenant.close_time.slice(0, 5)}
                  </span>
                )}
                {tenant.city && (
                  <span style={{ fontSize: 12, color: '#6C757D' }}>📍 {tenant.city}</span>
                )}
              </div>
            </div>
          </div>

          {/* CATEGORIAS */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 0 }}>
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                padding: '12px 16px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                color: activeCategory === null ? '#00B894' : '#6C757D',
                borderBottom: activeCategory === null ? '2px solid #00B894' : '2px solid transparent'
              }}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '12px 16px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  color: activeCategory === cat.id ? '#00B894' : '#6C757D',
                  borderBottom: activeCategory === cat.id ? '2px solid #00B894' : '2px solid transparent'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {step === 'menu' && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px', paddingBottom: 100 }}>

          {/* BUSCA */}
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <input
              type="text"
              placeholder="Busque por um produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 10, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 18 }}>🔍</span>
          </div>

          {filteredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🍽️</div>
              <div>Nenhum produto encontrado</div>
            </div>
          )}

          {/* GRID DE PRODUTOS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filteredProducts.map(product => {
              const qty = getQty(product.id)
              return (
                <div key={product.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E', marginBottom: 4 }}>{product.name}</div>
                    {product.description && (
                      <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 8, lineHeight: 1.4, flex: 1 }}>{product.description}</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#00B894' }}>
                        {'R$ ' + Number(product.price).toFixed(2)}
                      </div>
                      {qty === 0 ? (
                        <button onClick={() => addToCart(product)}
                          style={{ padding: '6px 16px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          Adicionar
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => removeFromCart(product.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E9ECEF', background: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>{qty}</span>
                          <button onClick={() => addToCart(product)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#00B894', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {cart.length > 0 && step === 'menu' && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
          <button onClick={() => setStep('checkout')}
            style={{ background: '#00B894', color: '#fff', border: 'none', borderRadius: 30, padding: '14px 32px', cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px rgba(0,184,148,0.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{getTotalItems()}</span>
            Ver pedido — R$ {getSubtotal().toFixed(2)}
          </button>
        </div>
      )}

      {step === 'checkout' && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 100px' }}>
          <button onClick={() => setStep('menu')} style={{ background: 'none', border: 'none', color: '#6C757D', cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>
            ← Voltar ao cardápio
          </button>

          {tableNumber && (
            <div style={{ background: '#E8F8F5', border: '1px solid #00B894', borderRadius: 12, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🪑</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#00B894' }}>Mesa {tableNumber}</div>
                <div style={{ fontSize: 12, color: '#6C757D' }}>Pedido para consumo no salão</div>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>RESUMO DO PEDIDO</div>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8F9FA' }}>
                <span style={{ fontSize: 14, color: '#1A1A2E' }}>{item.qty}x {item.name}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>R$ {(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: 14, color: '#6C757D' }}>Subtotal</span>
              <span style={{ fontSize: 14 }}>R$ {getSubtotal().toFixed(2)}</span>
            </div>
            {!tableNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 14, color: '#6C757D' }}>Taxa de entrega</span>
                <span style={{ fontSize: 14, color: deliveryFee !== null ? '#1A1A2E' : '#adb5bd' }}>
                  {deliveryFee !== null ? (deliveryFee === 0 ? 'Grátis' : 'R$ ' + deliveryFee.toFixed(2)) : '--'}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: '1px solid #E9ECEF', marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#00B894' }}>
                R$ {tableNumber ? getSubtotal().toFixed(2) : getTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {tableNumber ? (
            <button onClick={handleSubmitOrder} disabled={submitting}
              style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              {submitting ? 'Enviando pedido...' : 'Confirmar pedido — R$ ' + getSubtotal().toFixed(2)}
            </button>
          ) : (
            <>
              <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>SEUS DADOS</div>
                <input type="tel" placeholder="Telefone *" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  onBlur={e => lookupCustomer(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <input type="text" placeholder="Seu nome *" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <input type="text" placeholder="Endereço (rua e número) *" value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <input type="text" placeholder="Bairro *" value={form.neighborhood}
                  onChange={e => { setForm({ ...form, neighborhood: e.target.value }); checkDeliveryFee(e.target.value) }}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: neighborhoodError ? '1px solid #e53935' : '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 4 }} />
                {neighborhoodError && <p style={{ color: '#e53935', fontSize: 12, margin: '0 0 10px' }}>{neighborhoodError}</p>}
                {deliveryFee !== null && !neighborhoodError && (
                  <p style={{ color: '#00B894', fontSize: 12, margin: '0 0 10px', fontWeight: 600 }}>
                    {deliveryFee === 0 ? 'Entrega grátis neste bairro!' : 'Taxa de entrega: R$ ' + deliveryFee.toFixed(2)}
                  </p>
                )}
                <input type="text" placeholder="Cidade" value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>FORMA DE PAGAMENTO</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {['dinheiro', 'pix', 'debito', 'credito'].map(method => (
                    <button key={method} onClick={() => setForm({ ...form, payment_method: method })}
                      style={{
                        padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        border: form.payment_method === method ? '2px solid #00B894' : '1px solid #E9ECEF',
                        background: form.payment_method === method ? '#E8F8F5' : '#fff',
                        color: form.payment_method === method ? '#00B894' : '#6C757D'
                      }}>
                      {method === 'dinheiro' ? 'Dinheiro' : method === 'pix' ? 'Pix' : method === 'debito' ? 'Débito' : 'Crédito'}
                    </button>
                  ))}
                </div>
                {form.payment_method === 'dinheiro' && (
                  <input type="number" placeholder="Troco para quanto? (opcional)" value={form.change_for}
                    onChange={e => setForm({ ...form, change_for: e.target.value })}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>

              <button onClick={handleSubmitOrder} disabled={submitting}
                style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                {submitting ? 'Enviando pedido...' : 'Confirmar pedido — R$ ' + getTotal().toFixed(2)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}