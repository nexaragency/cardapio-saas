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
  novo: 'Aguardando confirmacao do restaurante',
  impresso: 'O restaurante confirmou seu pedido',
  em_preparo: 'Seu pedido esta sendo preparado',
  saiu_entrega: 'O motoboy esta a caminho!',
  entregue: 'Pedido entregue. Bom apetite!'
}

export default function CardapioPublico({ params }) {
  const { slug } = use(params)
  const [tableNumber, setTableNumber] = useState(null)
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
      const urlParams = new URLSearchParams(window.location.search)
const mesa = urlParams.get('mesa')
if (mesa) setTableNumber(mesa)
    }
    loadData()
  }, [slug])

  useEffect(() => {
    if (!currentOrder) return

    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const channel = supabase
      .channel('order_' + currentOrder.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: 'id=eq.' + currentOrder.id
      }, payload => {
        const updated = payload.new
        setCurrentOrder(prev => ({ ...prev, ...updated }))

        if (updated.status === 'saiu_entrega' && Notification.permission === 'granted') {
          new Notification('Seu pedido saiu para entrega!', {
            body: 'O motoboy esta a caminho. Prepare-se!',
            icon: '/favicon.ico'
          })
        }

        if (updated.status === 'entregue') {
          localStorage.removeItem('order_' + slug)
        }
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
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        address: data.address || prev.address,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city
      }))
      if (data.neighborhood) checkDeliveryFee(data.neighborhood)
    }
  }

  function checkDeliveryFee(neighborhood) {
    if (!neighborhood.trim()) { setDeliveryFee(null); setNeighborhoodError(''); return }
    const zone = zones.find(z => z.neighborhood.toLowerCase().trim() === neighborhood.toLowerCase().trim())
    if (zone) { setDeliveryFee(zone.fee); setNeighborhoodError('') }
    else { setDeliveryFee(null); setNeighborhoodError('Bairro fora da area de entrega') }
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
      if (!form.address.trim()) { alert('Informe seu endereco'); return }
      if (!form.neighborhood.trim()) { alert('Informe seu bairro'); return }
      if (neighborhoodError) { alert('Bairro fora da area de entrega'); return }
      if (deliveryFee === null) { alert('Informe um bairro valido'); return }
    }

    setSubmitting(true)

    const { data: order, error: orderError } = await supabase
      .from('orders').insert({
        tenant_id: tenant.id,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: form.address,
        neighborhood: form.neighborhood,
        city: form.city,
        payment_method: form.payment_method,
        change_for: form.change_for ? parseFloat(form.change_for) : null,
        delivery_fee: deliveryFee || 0,
        total: getTotal(),
        status: 'novo',
table_number: tableNumber ? parseInt(tableNumber) : null,
order_type: tableNumber ? 'salao' : 'delivery'
      }).select().single()

    if (orderError) { alert('Erro ao fazer pedido. Tente novamente.'); setSubmitting(false); return }

    await supabase.from('order_items').insert(
      cart.map(i => ({
        order_id: order.id,
        product_id: i.id,
        product_name: i.name,
        quantity: i.qty,
        unit_price: i.price,
        subtotal: i.price * i.qty
      }))
    )

    await supabase.from('customers').upsert({
      tenant_id: tenant.id,
      name: form.name,
      phone: form.phone,
      address: form.address,
      neighborhood: form.neighborhood,
      city: form.city
    }, { onConflict: 'tenant_id,phone' })

    localStorage.setItem('order_' + slug, order.id)

    const { data: fullOrder } = await supabase
      .from('orders').select('*, order_items(*)')
      .eq('id', order.id).single()

    setCurrentOrder(fullOrder)
    setCart([])
    setSubmitting(false)
    setStep('tracking')
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

  if (step === 'tracking' && currentOrder) {
    const statusIndex = STATUS_FLOW.indexOf(currentOrder.status)
    const isDelivered = currentOrder.status === 'entregue'

    return (
      <div style={{ background: '#F8F9FA', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ background: '#00B894', padding: '28px 20px 20px', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{tenant.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>
            {tableNumber ? (
  <>
    <button
      onClick={handleSubmitOrder}
      disabled={submitting}
      style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
    >
      {submitting ? 'Enviando pedido...' : 'Confirmar pedido — R$ ' + getSubtotal().toFixed(2)}
    </button>
  </>
) : (
          </p>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 28, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {currentOrder.status === 'novo' ? '🕐' :
               currentOrder.status === 'impresso' ? '✅' :
               currentOrder.status === 'em_preparo' ? '👨‍🍳' :
               currentOrder.status === 'saiu_entrega' ? '🛵' : '🎉'}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: '0 0 8px' }}>
              {STATUS_LABEL[currentOrder.status]}
            </h2>
            <p style={{ color: '#6C757D', fontSize: 14, margin: 0 }}>
              {STATUS_DESC[currentOrder.status]}
            </p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              {STATUS_FLOW.map((s, i) => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i <= statusIndex ? '#00B894' : '#E9ECEF',
                    color: i <= statusIndex ? '#fff' : '#adb5bd',
                    fontSize: 12, fontWeight: 700, marginBottom: 6
                  }}>
                    {i < statusIndex ? '✓' : i + 1}
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div style={{ position: 'absolute' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ height: 4, background: '#E9ECEF', borderRadius: 2, position: 'relative', marginBottom: 8 }}>
              <div style={{
                height: 4, background: '#00B894', borderRadius: 2,
                width: (statusIndex / (STATUS_FLOW.length - 1) * 100) + '%',
                transition: 'width 0.5s ease'
              }} />
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
              <span style={{ color: '#1A1A2E' }}>Total</span>
              <span style={{ color: '#00B894' }}>R$ {Number(currentOrder.total).toFixed(2)}</span>
            </div>
          </div>

          {isDelivered ? (
            <button
              onClick={() => { setStep('menu'); setCurrentOrder(null); localStorage.removeItem('order_' + slug) }}
              style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
            >
              Fazer novo pedido
            </button>
          ) : (
            <p style={{ textAlign: 'center', color: '#adb5bd', fontSize: 12, margin: 0 }}>
              Atualizando automaticamente...
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#F8F9FA', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif', paddingBottom: 100 }}>
      <div style={{ background: '#00B894', padding: '28px 20px 20px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28, fontWeight: 700, color: '#fff' }}>
          {tenant.name.charAt(0)}
        </div>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{tenant.name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>Cardapio Digital</p>
      </div>

      {step === 'menu' && (
        <>
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
                  <div key={product.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E', marginBottom: 4 }}>{product.name}</div>
                      {product.description && <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 6 }}>{product.description}</div>}
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#00B894' }}>{'R$ ' + Number(product.price).toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      {product.image_url && <img src={product.image_url} alt={product.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />}
                      {qty === 0 ? (
                        <button onClick={() => addToCart(product)} style={{ padding: '6px 16px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Adicionar</button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={() => removeFromCart(product.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E9ECEF', background: '#fff', cursor: 'pointer', fontSize: 16 }}>-</button>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>{qty}</span>
                          <button onClick={() => addToCart(product)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#00B894', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {cart.length > 0 && (
            <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
              <button
                onClick={() => setStep('checkout')}
                style={{ background: '#00B894', color: '#fff', border: 'none', borderRadius: 30, padding: '14px 32px', cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px rgba(0,184,148,0.4)', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{getTotalItems()}</span>
                Ver pedido — R$ {getSubtotal().toFixed(2)}
              </button>
            </div>
          )}
        </>
      )}

      {step === 'checkout' && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>
          <button onClick={() => setStep('menu')} style={{ background: 'none', border: 'none', color: '#6C757D', cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>
            Voltar ao cardapio
          </button>

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
              <span style={{ fontSize: 14, color: '#1A1A2E' }}>R$ {getSubtotal().toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: 14, color: '#6C757D' }}>Taxa de entrega</span>
              <span style={{ fontSize: 14, color: deliveryFee !== null ? '#1A1A2E' : '#adb5bd' }}>
                {deliveryFee !== null ? (deliveryFee === 0 ? 'Gratis' : 'R$ ' + deliveryFee.toFixed(2)) : '--'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: '1px solid #E9ECEF', marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#00B894' }}>R$ {getTotal().toFixed(2)}</span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>SEUS DADOS</div>
            <input type="tel" placeholder="Telefone *" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              onBlur={e => lookupCustomer(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            <input type="text" placeholder="Seu nome *" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            <input type="text" placeholder="Endereco (rua e numero) *" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            <input type="text" placeholder="Bairro *" value={form.neighborhood}
              onChange={e => { setForm({ ...form, neighborhood: e.target.value }); checkDeliveryFee(e.target.value) }}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: neighborhoodError ? '1px solid #e53935' : '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 4 }} />
            {neighborhoodError && <p style={{ color: '#e53935', fontSize: 12, margin: '0 0 10px' }}>{neighborhoodError}</p>}
            {deliveryFee !== null && !neighborhoodError && (
              <p style={{ color: '#00B894', fontSize: 12, margin: '0 0 10px', fontWeight: 600 }}>
                {deliveryFee === 0 ? 'Entrega gratis neste bairro!' : 'Taxa de entrega: R$ ' + deliveryFee.toFixed(2)}
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
                    background: form.payment_method === method ? '#E8F5F5' : '#fff',
                    color: form.payment_method === method ? '#00B894' : '#6C757D'
                  }}
                >
                  {method === 'dinheiro' ? 'Dinheiro' : method === 'pix' ? 'Pix' : method === 'debito' ? 'Cartao Debito' : 'Cartao Credito'}
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
            style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
          >
            {submitting ? 'Enviando pedido...' : 'Confirmar pedido — R$ ' + getTotal().toFixed(2)}
          </button>
        </div>
      )}
    </div>
  )
}