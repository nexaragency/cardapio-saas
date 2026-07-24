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
const DIETARY_TAGS = {
  vegetariano: { label: 'Vegetariano', icon: '🌱' },
  vegano: { label: 'Vegano', icon: '🌿' },
  sem_gluten: { label: 'Sem Glúten', icon: '🌾' },
  sem_lactose: { label: 'Sem Lactose', icon: '🥛' },
  picante: { label: 'Picante', icon: '🌶️' }
}

export default function CardapioPublico({ params }) {
  const { slug } = use(params)
  const [tenant, setTenant] = useState(null)
  const [categories, setCategories] = useState([])
  const [addonCategories, setAddonCategories] = useState([])
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
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedVariation, setSelectedVariation] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [observation, setObservation] = useState('')
  const [addonProducts, setAddonProducts] = useState([])
  const [form, setForm] = useState({
    name: '', phone: '', address: '', neighborhood: '', city: '',
    payment_method: 'dinheiro', change_for: ''
  })
  const [deliveryFee, setDeliveryFee] = useState(null)
  const [neighborhoodError, setNeighborhoodError] = useState('')
  const [bestsellerIds, setBestsellerIds] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [cashbackBalance, setCashbackBalance] = useState(0)
  const [useCashback, setUseCashback] = useState(false)
  const [deliveryTiming, setDeliveryTiming] = useState('now')
  const [scheduledFor, setScheduledFor] = useState('')
  const [lastOrder, setLastOrder] = useState(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

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
        setIsOpen(current >= (oh * 60 + om) && current <= (ch * 60 + cm))
      }

      const { data: cats } = await supabase
        .from('categories').select('*')
        .eq('tenant_id', tenantData.id).eq('active', true).order('position')

      const normalCats = (cats || []).filter(c => !c.is_addon)
      const addonCats = (cats || []).filter(c => c.is_addon)
      setCategories(normalCats)
      setAddonCategories(addonCats)
      if (normalCats.length > 0) setActiveCategory(normalCats[0].id)

      const { data: prods } = await supabase
        .from('products').select('*, categories(name), product_variations(*)')
        .eq('tenant_id', tenantData.id).eq('active', true).order('position')
      setProducts(prods || [])

      if (addonCats.length > 0) {
        const addonCatIds = addonCats.map(c => c.id)
        const { data: addonProds } = await supabase
          .from('products').select('*, categories(name)')
          .eq('tenant_id', tenantData.id).eq('active', true)
          .in('category_id', addonCatIds)
        setAddonProducts(addonProds || [])
      }

      const { data: zns } = await supabase
        .from('delivery_zones').select('*')
        .eq('tenant_id', tenantData.id).eq('active', true)
      setZones(zns || [])

      fetch('/api/public/bestsellers?slug=' + slug)
        .then(res => res.json())
        .then(data => setBestsellerIds(data.productIds || []))
        .catch(() => {})

      const urlParams = new URLSearchParams(window.location.search)
      const mesa = urlParams.get('mesa')
      if (mesa) setTableNumber(mesa)

      const savedOrderId = localStorage.getItem('order_' + slug)
      if (savedOrderId) {
        const res = await fetch('/api/public/orders/' + savedOrderId)
        if (res.ok) {
          const { order: savedOrder } = await res.json()
          if (savedOrder && savedOrder.status !== 'entregue') {
            setCurrentOrder(savedOrder)
            setStep('tracking')
          }
        }
      }

      setLoading(false)
    }
    loadData()
  }, [slug])

  useEffect(() => {
    if (!tenant) return

    if (tenant.meta_pixel_id && !window.fbq) {
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
        }
        if (!f._fbq) f._fbq = n
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []
        t = b.createElement(e); t.async = true; t.src = v
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
      window.fbq('init', tenant.meta_pixel_id)
      window.fbq('track', 'PageView')
    }

    if (tenant.tiktok_pixel_id && !window.ttq) {
      !function (w, d, t) {
        w.TiktokAnalyticsObject = t
        var ttq = w[t] = w[t] || []
        ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i])
        ttq.load = function (e, n) {
          var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'
          ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i
          ttq._t = ttq._t || {}; ttq._t[e] = +new Date
          ttq._o = ttq._o || {}; ttq._o[e] = n || {}
          var o = d.createElement('script'); o.type = 'text/javascript'; o.async = true; o.src = i + '?sdkid=' + e + '&lib=' + t
          var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a)
        }
        ttq.load(tenant.tiktok_pixel_id)
        ttq.page()
      }(window, document, 'ttq')
    }

    if (tenant.google_ads_id && !window.gtag) {
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + tenant.google_ads_id
      document.head.appendChild(script)
      window.dataLayer = window.dataLayer || []
      window.gtag = function () { window.dataLayer.push(arguments) }
      window.gtag('js', new Date())
      window.gtag('config', tenant.google_ads_id)
    }
  }, [tenant])

  function trackPixels(eventName, data = {}) {
    if (typeof window === 'undefined') return
    if (tenant?.meta_pixel_id && window.fbq) window.fbq('track', eventName, data)
    if (tenant?.tiktok_pixel_id && window.ttq) {
      const ttEventMap = { ViewContent: 'ViewContent', AddToCart: 'AddToCart', InitiateCheckout: 'InitiateCheckout', Purchase: 'CompletePayment' }
      window.ttq.track(ttEventMap[eventName] || eventName, data)
    }
    if (eventName === 'Purchase' && tenant?.google_ads_id && window.gtag) {
      window.gtag('event', 'conversion', { send_to: tenant.google_ads_id, value: data.value, currency: data.currency || 'BRL' })
    }
  }

  useEffect(() => {
    if (!currentOrder) return
    if (currentOrder.order_type === 'salao') return
    if (Notification.permission === 'default') Notification.requestPermission()

    const interval = setInterval(async () => {
      const res = await fetch('/api/public/orders/' + currentOrder.id)
      if (!res.ok) return
      const { order: updated } = await res.json()
      if (!updated) return

      setCurrentOrder(prev => {
        if (prev && updated.status !== prev.status && updated.status === 'saiu_entrega' && Notification.permission === 'granted') {
          new Notification('Seu pedido saiu para entrega!', { body: 'O motoboy está a caminho!' })
        }
        return { ...prev, ...updated }
      })
      if (updated.status === 'entregue') {
        localStorage.removeItem('order_' + slug)
        clearInterval(interval)
      }
    }, 6000)

    return () => clearInterval(interval)
  }, [currentOrder?.id])

  async function lookupCustomer(phone) {
    if (!phone || phone.length < 8 || !tenant) return
    const res = await fetch('/api/public/customers/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, phone })
    })
    const { customer: data, cashback_balance, lastOrder: lastOrderData } = await res.json()
    if (data) {
      setForm(prev => ({ ...prev, name: data.name || prev.name, address: data.address || prev.address, neighborhood: data.neighborhood || prev.neighborhood, city: data.city || prev.city }))
      if (data.neighborhood) checkDeliveryFee(data.neighborhood)
    }
    setCashbackBalance(cashback_balance || 0)
    setLastOrder(lastOrderData || null)
  }

  function repeatLastOrder() {
    if (!lastOrder) return
    const newItems = []
    let skipped = 0
    for (const item of lastOrder.items) {
      const product = products.find(p => p.id === item.product_id && p.active)
      if (!product) { skipped++; continue }
      newItems.push({
        id: product.id + Date.now() + Math.random(),
        productId: product.id,
        variationId: null,
        name: product.name,
        price: Number(product.price),
        addons: [],
        observation: item.observation || '',
        qty: item.quantity,
        image_url: product.image_url
      })
    }
    setCart(prev => [...prev, ...newItems])
    if (skipped > 0) alert(skipped + ' item(ns) do pedido anterior nao estao mais disponiveis e foram ignorados.')
    setStep('checkout')
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError('')
    const res = await fetch('/api/public/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, code: couponCode, subtotal: getSubtotal() })
    })
    const data = await res.json()
    setCouponLoading(false)
    if (!data.valid) {
      setCouponError(data.message || 'Cupom invalido')
      setCouponApplied(null)
      return
    }
    setCouponApplied({ code: couponCode.trim().toUpperCase(), discount_amount: data.discount_amount })
  }

  function removeCoupon() {
    setCouponApplied(null)
    setCouponCode('')
    setCouponError('')
  }

  function checkDeliveryFee(neighborhood) {
    if (!neighborhood.trim()) { setDeliveryFee(null); setNeighborhoodError(''); return }
    const zone = zones.find(z => z.neighborhood.toLowerCase().trim() === neighborhood.toLowerCase().trim())
    if (zone) { setDeliveryFee(zone.fee); setNeighborhoodError('') }
    else { setDeliveryFee(null); setNeighborhoodError('Bairro fora da área de entrega') }
  }

  function openProductModal(product) {
    setSelectedProduct(product)
    setSelectedVariation(product.product_variations?.length === 1 ? product.product_variations[0] : null)
    setSelectedAddons([])
    setObservation('')
    trackPixels('ViewContent', { content_ids: [product.id], content_name: product.name, content_type: 'product', value: Number(product.price), currency: 'BRL' })
  }

  function closeModal() {
    setSelectedProduct(null)
    setSelectedVariation(null)
    setSelectedAddons([])
    setObservation('')
  }

  function toggleAddon(addon) {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id)
      if (exists) return prev.filter(a => a.id !== addon.id)
      return [...prev, addon]
    })
  }

  function getModalTotal() {
    if (!selectedProduct) return 0
    const basePrice = selectedVariation ? Number(selectedVariation.price) : Number(selectedProduct.price)
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price), 0)
    return basePrice + addonsTotal
  }

  function addToCartFromModal() {
    if (!selectedProduct) return
    if (selectedProduct.product_variations?.length > 0 && !selectedVariation) {
      alert('Selecione um tamanho para continuar')
      return
    }

    const cartItem = {
      id: selectedProduct.id + (selectedVariation?.id || '') + Date.now(),
      productId: selectedProduct.id,
      variationId: selectedVariation?.id || null,
      name: selectedProduct.name + (selectedVariation ? ' (' + selectedVariation.name + ')' : ''),
      price: selectedVariation ? Number(selectedVariation.price) : Number(selectedProduct.price),
      addons: selectedAddons,
      observation: observation,
      qty: 1,
      image_url: selectedProduct.image_url
    }

    setCart(prev => [...prev, cartItem])
    trackPixels('AddToCart', { content_ids: [cartItem.productId], content_name: cartItem.name, content_type: 'product', value: getModalTotal(), currency: 'BRL' })
    closeModal()
  }

  function removeFromCart(id) {
    setCart(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      if (item.qty === 1) return prev.filter(i => i.id !== id)
      return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i)
    })
  }

  function addQty(id) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i))
  }

  function getItemTotal(item) {
    return (item.price + item.addons.reduce((sum, a) => sum + Number(a.price), 0)) * item.qty
  }

  function getSubtotal() { return cart.reduce((sum, i) => sum + getItemTotal(i), 0) }
  function getDiscount() { return couponApplied ? couponApplied.discount_amount : 0 }
  function getCashbackApplied() {
    if (!useCashback || tableNumber) return 0
    const maxUsable = Math.max(0, getSubtotal() + (deliveryFee || 0) - getDiscount())
    return Math.min(cashbackBalance, maxUsable)
  }
  function getTotal() { return Math.max(0, getSubtotal() + (deliveryFee || 0) - getDiscount() - getCashbackApplied()) }
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

    const res = await fetch('/api/public/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        tableNumber,
        cart: cart.map(item => ({
          productId: item.productId,
          variationId: item.variationId || null,
          qty: item.qty,
          observation: item.observation,
          addons: item.addons.map(a => ({ id: a.id }))
        })),
        form,
        couponCode: couponApplied ? couponApplied.code : null,
        cashbackUsed: getCashbackApplied(),
        scheduledFor: (!tableNumber && deliveryTiming === 'scheduled' && scheduledFor) ? new Date(scheduledFor).toISOString() : null
      })
    })

    const data = await res.json()
    if (!res.ok || data.error) { alert(data.error || 'Erro ao fazer pedido. Tente novamente.'); setSubmitting(false); return }

    localStorage.setItem('order_' + slug, data.order.id)
    trackPixels('Purchase', {
      value: Number(data.order.total),
      currency: 'BRL',
      content_ids: cart.map(i => i.productId),
      num_items: getTotalItems()
    })
    setCurrentOrder(data.order)
    setCart([])
    setCouponApplied(null)
    setCouponCode('')
    setUseCashback(false)
    setDeliveryTiming('now')
    setScheduledFor('')
    setRatingValue(0)
    setRatingComment('')
    setRatingSubmitted(false)
    setSubmitting(false)
    setStep('tracking')
  }

  async function submitRating() {
    if (!currentOrder || ratingValue < 1) return
    setRatingSubmitting(true)
    const res = await fetch('/api/public/orders/' + currentOrder.id + '/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: ratingValue, comment: ratingComment })
    })
    setRatingSubmitting(false)
    if (res.ok) setRatingSubmitted(true)
  }

  const filteredProducts = products.filter(p => {
    const matchCategory = activeCategory ? p.category_id === activeCategory : true
    const matchSearch = searchTerm ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
    const isAddon = addonCategories.some(c => c.id === p.category_id)
    return matchCategory && matchSearch && !isAddon
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

  const cor = tenant.primary_color || '#00B894'

  if (step === 'tracking' && currentOrder) {
    const statusIndex = STATUS_FLOW.indexOf(currentOrder.status)
    const isDelivered = currentOrder.status === 'entregue'

    if (currentOrder.order_type === 'salao') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif', padding: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 400, width: '100%' }}>
            <div style={{ width: 64, height: 64, background: cor + '20', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 10px' }}>Pedido recebido!</h2>
            <p style={{ color: '#6C757D', fontSize: 14, margin: '0 0 8px' }}>{'Mesa ' + currentOrder.table_number}</p>
            <p style={{ color: '#6C757D', fontSize: 14, margin: '0 0 24px' }}>Seu pedido já foi enviado para a cozinha. Em breve estará na sua mesa!</p>
            <div style={{ background: '#F8F9FA', borderRadius: 10, padding: 16, marginBottom: 24, textAlign: 'left' }}>
              {currentOrder.order_items && currentOrder.order_items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: '#1A1A2E' }}>{item.quantity}x {item.product_name}</span>
                  <span style={{ fontWeight: 600, color: '#1A1A2E' }}>R$ {Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #E9ECEF', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: cor }}>R$ {Number(currentOrder.total).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={() => { setStep('menu'); setCurrentOrder(null); localStorage.removeItem('order_' + slug) }}
              style={{ width: '100%', padding: '12px', background: cor, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Fazer novo pedido
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ background: '#F8F9FA', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ background: cor, padding: '28px 20px 20px', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{tenant.name}</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0 }}>Pedido #{currentOrder.id.slice(-6).toUpperCase()}</p>
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
              <div style={{ height: 4, background: cor, borderRadius: 2, width: (statusIndex / (STATUS_FLOW.length - 1) * 100) + '%', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {STATUS_FLOW.map((s, i) => (
                <div key={s} style={{ width: 24, height: 24, borderRadius: '50%', background: i <= statusIndex ? cor : '#E9ECEF', color: i <= statusIndex ? '#fff' : '#adb5bd', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <span style={{ color: cor }}>R$ {Number(currentOrder.total).toFixed(2)}</span>
            </div>
          </div>
          {isDelivered && !currentOrder.rating && (
            <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              {ratingSubmitted ? (
                <p style={{ textAlign: 'center', color: cor, fontWeight: 600, fontSize: 14, margin: 0 }}>Obrigado pela avaliação! 🎉</p>
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 12 }}>COMO FOI SEU PEDIDO?</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setRatingValue(n)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 28, padding: 0, opacity: n <= ratingValue ? 1 : 0.3 }}>
                        ⭐
                      </button>
                    ))}
                  </div>
                  <textarea placeholder="Deixe um comentário (opcional)" value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', resize: 'none', height: 70, boxSizing: 'border-box', marginBottom: 12 }} />
                  <button onClick={submitRating} disabled={ratingValue < 1 || ratingSubmitting}
                    style={{ width: '100%', padding: '12px', background: ratingValue < 1 ? '#E9ECEF' : cor, color: '#fff', border: 'none', borderRadius: 8, cursor: ratingValue < 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 700 }}>
                    {ratingSubmitting ? 'Enviando...' : 'Enviar avaliação'}
                  </button>
                </>
              )}
            </div>
          )}
          {isDelivered ? (
            <button onClick={() => { setStep('menu'); setCurrentOrder(null); localStorage.removeItem('order_' + slug) }}
              style={{ width: '100%', padding: '14px', background: cor, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
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

      <div style={{ width: '100%', height: 200, overflow: 'hidden', background: 'linear-gradient(135deg, ' + cor + ', ' + cor + 'AA)' }}>
        {tenant.banner_url && (
          <img src={tenant.banner_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        )}
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid #E9ECEF', padding: '0 20px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, paddingBottom: 16 }}>
            <div style={{ width: 88, height: 88, borderRadius: 14, flexShrink: 0, border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -44, position: 'relative', zIndex: 10 }}>
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{tenant.name.charAt(0)}</span>
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>{tenant.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isOpen ? cor : '#e53935' }}>
                  {isOpen ? '● Aberto' : '● Fechado'}
                </span>
                {tenant.open_time && tenant.close_time && (
                  <span style={{ fontSize: 12, color: '#6C757D' }}>
                    {'Funciona das ' + tenant.open_time.slice(0, 5) + ' às ' + tenant.close_time.slice(0, 5)}
                  </span>
                )}
                {tenant.city && <span style={{ fontSize: 12, color: '#6C757D' }}>📍 {tenant.city}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            <button onClick={() => setActiveCategory(null)}
              style={{ padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: activeCategory === null ? cor : '#6C757D', borderBottom: activeCategory === null ? '2px solid ' + cor : '2px solid transparent' }}>
              Todos
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                style={{ padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: activeCategory === cat.id ? cor : '#6C757D', borderBottom: activeCategory === cat.id ? '2px solid ' + cor : '2px solid transparent' }}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {step === 'menu' && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px', paddingBottom: 100 }}>
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <input type="text" placeholder="Busque por um produto..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 10, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 18 }}>🔍</span>
          </div>

          {products.filter(p => p.featured && !addonCategories.some(c => c.id === p.category_id)).length > 0 && !searchTerm && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>⭐ Destaques</h2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {products.filter(p => p.featured && !addonCategories.some(c => c.id === p.category_id)).map(product => {
                  const minPrice = product.product_variations?.length > 0
                    ? Math.min(...product.product_variations.map(v => Number(v.price)))
                    : null
                  return (
                    <div key={product.id} onClick={() => openProductModal(product)}
                      style={{ minWidth: 200, background: '#fff', borderRadius: 12, border: '2px solid #FFD166', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      )}
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1A2E', marginBottom: 4 }}>{product.name}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cor }}>
                          {minPrice !== null ? 'A partir de R$ ' + minPrice.toFixed(2) : 'R$ ' + Number(product.price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {bestsellerIds.length > 0 && !searchTerm && (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>🔥 Mais pedidos</h2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {bestsellerIds
                  .map(id => products.find(p => p.id === id && !addonCategories.some(c => c.id === p.category_id)))
                  .filter(Boolean)
                  .map(product => {
                    const minPrice = product.product_variations?.length > 0
                      ? Math.min(...product.product_variations.map(v => Number(v.price)))
                      : null
                    return (
                      <div key={product.id} onClick={() => openProductModal(product)}
                        style={{ minWidth: 200, background: '#fff', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                        )}
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1A2E', marginBottom: 4 }}>{product.name}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: cor }}>
                            {minPrice !== null ? 'A partir de R$ ' + minPrice.toFixed(2) : 'R$ ' + Number(product.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🍽️</div>
              <div>Nenhum produto encontrado</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filteredProducts.map(product => {
              const minPrice = product.product_variations?.length > 0
                ? Math.min(...product.product_variations.map(v => Number(v.price)))
                : null
              const outOfStock = product.stock_enabled && Number(product.stock_quantity) <= 0
              return (
                <div key={product.id} onClick={() => !outOfStock && openProductModal(product)}
                  style={{ background: '#fff', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: outOfStock ? 'default' : 'pointer', opacity: outOfStock ? 0.5 : 1 }}>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E', marginBottom: 4 }}>{product.name}</div>
                    {product.dietary_tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                        {product.dietary_tags.map(tag => DIETARY_TAGS[tag] && (
                          <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: '#6C757D', background: '#F8F9FA', padding: '2px 6px', borderRadius: 10 }}>
                            {DIETARY_TAGS[tag].icon} {DIETARY_TAGS[tag].label}
                          </span>
                        ))}
                      </div>
                    )}
                    {product.description && (
                      <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 8, lineHeight: 1.4, flex: 1 }}>{product.description}</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: cor }}>
                        {outOfStock ? 'Esgotado' : minPrice !== null ? 'A partir de R$ ' + minPrice.toFixed(2) : 'R$ ' + Number(product.price).toFixed(2)}
                      </div>
                      {!outOfStock && (
                        <button onClick={e => { e.stopPropagation(); openProductModal(product) }}
                          style={{ padding: '6px 16px', background: cor, color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL DO PRODUTO */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {selectedProduct.image_url && (
              <img src={selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>{selectedProduct.name}</h2>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6C757D', lineHeight: 1 }}>×</button>
              </div>
              {selectedProduct.dietary_tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {selectedProduct.dietary_tags.map(tag => DIETARY_TAGS[tag] && (
                    <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: '#6C757D', background: '#F8F9FA', padding: '3px 8px', borderRadius: 10 }}>
                      {DIETARY_TAGS[tag].icon} {DIETARY_TAGS[tag].label}
                    </span>
                  ))}
                </div>
              )}
              {selectedProduct.description && (
                <p style={{ fontSize: 14, color: '#6C757D', margin: '0 0 20px', lineHeight: 1.6 }}>{selectedProduct.description}</p>
              )}

              {selectedProduct.product_variations?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>
                    Escolha o tamanho <span style={{ color: '#e53935', fontSize: 11 }}>*obrigatório</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedProduct.product_variations.sort((a, b) => a.position - b.position).map(v => (
                      <div key={v.id} onClick={() => setSelectedVariation(v)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, border: selectedVariation?.id === v.id ? '2px solid ' + cor : '1px solid #E9ECEF', cursor: 'pointer', background: selectedVariation?.id === v.id ? cor + '10' : '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid ' + (selectedVariation?.id === v.id ? cor : '#E9ECEF'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selectedVariation?.id === v.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor }} />}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>{v.name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: cor }}>R$ {Number(v.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addonProducts.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>
                    Adicionais <span style={{ fontSize: 11, color: '#6C757D', fontWeight: 400 }}>(opcional)</span>
                  </div>
                  {addonCategories.map(cat => {
                    const catAddons = addonProducts.filter(p => p.category_id === cat.id)
                    if (catAddons.length === 0) return null
                    return (
                      <div key={cat.id} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 8 }}>{cat.name.toUpperCase()}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {catAddons.map(addon => {
                            const selected = selectedAddons.some(a => a.id === addon.id)
                            return (
                              <div key={addon.id} onClick={() => toggleAddon(addon)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, border: selected ? '2px solid ' + cor : '1px solid #E9ECEF', cursor: 'pointer', background: selected ? cor + '10' : '#fff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 20, height: 20, borderRadius: 4, border: '2px solid ' + (selected ? cor : '#E9ECEF'), background: selected ? cor : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {selected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                                  </div>
                                  <span style={{ fontSize: 14, color: '#1A1A2E' }}>{addon.name}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: Number(addon.price) > 0 ? cor : '#adb5bd' }}>
                                  {Number(addon.price) > 0 ? '+ R$ ' + Number(addon.price).toFixed(2) : 'Grátis'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 8 }}>
                  Observação <span style={{ fontSize: 11, color: '#6C757D', fontWeight: 400 }}>(opcional)</span>
                </div>
                <textarea placeholder="Ex: sem cebola, bem passado, ponto da carne..."
                  value={observation} onChange={e => setObservation(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', resize: 'none', height: 80, boxSizing: 'border-box' }} />
              </div>

              <button onClick={addToCartFromModal}
                style={{ width: '100%', padding: '14px', background: cor, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                Adicionar — R$ {getModalTotal().toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && step === 'menu' && !selectedProduct && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
          <button onClick={() => { setStep('checkout'); trackPixels('InitiateCheckout', { value: getSubtotal(), currency: 'BRL', num_items: getTotalItems() }) }}
            style={{ background: cor, color: '#fff', border: 'none', borderRadius: 30, padding: '14px 32px', cursor: 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 20px ' + cor + '66', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{getTotalItems()}</span>
            Ver pedido — R$ {getSubtotal().toFixed(2)}
          </button>
        </div>
      )}

      {step === 'checkout' && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 100px' }}>
          <button onClick={() => setStep('menu')} style={{ background: 'none', border: 'none', color: '#6C757D', cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>
            Voltar ao cardápio
          </button>

          {tableNumber && (
            <div style={{ background: cor + '15', border: '1px solid ' + cor, borderRadius: 12, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🪑</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: cor }}>Mesa {tableNumber}</div>
                <div style={{ fontSize: 12, color: '#6C757D' }}>Pedido para consumo no salão</div>
              </div>
            </div>
          )}

          {!tableNumber && lastOrder && (
            <div style={{ background: cor + '10', border: '1px solid ' + cor, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: cor }}>🔁 Pedir novamente</div>
                <div style={{ fontSize: 12, color: '#6C757D' }}>
                  Último pedido de {new Date(lastOrder.created_at).toLocaleDateString('pt-BR')} — R$ {Number(lastOrder.total).toFixed(2)}
                </div>
              </div>
              <button onClick={repeatLastOrder}
                style={{ padding: '8px 16px', background: cor, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                Repetir pedido
              </button>
            </div>
          )}

          {(() => {
            const cartProductIds = new Set(cart.map(i => i.productId))
            const suggestions = products.filter(p =>
              p.featured && !addonCategories.some(c => c.id === p.category_id) &&
              !cartProductIds.has(p.id) && !(p.stock_enabled && Number(p.stock_quantity) <= 0)
            ).slice(0, 4)
            if (suggestions.length === 0) return null
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 10 }}>PEÇA TAMBÉM</div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {suggestions.map(product => (
                    <div key={product.id} style={{ minWidth: 140, background: '#fff', border: '1px solid #E9ECEF', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                      )}
                      <div style={{ padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>{product.name}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: cor, marginBottom: 6 }}>R$ {Number(product.price).toFixed(2)}</div>
                        <button onClick={() => {
                          if (product.product_variations?.length > 0) { openProductModal(product); setStep('menu') }
                          else setCart(prev => [...prev, { id: product.id + Date.now(), productId: product.id, variationId: null, name: product.name, price: Number(product.price), addons: [], observation: '', qty: 1, image_url: product.image_url }])
                        }}
                          style={{ width: '100%', padding: '5px', background: cor + '15', color: cor, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                          + Adicionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>RESUMO DO PEDIDO</div>
            {cart.map(item => (
              <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid #F8F9FA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#1A1A2E', fontWeight: 500 }}>{item.qty}x {item.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>R$ {getItemTotal(item).toFixed(2)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => removeFromCart(item.id)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E9ECEF', background: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                      <button onClick={() => addQty(item.id)} style={{ width: 24, height: 24, borderRadius: '50%', background: cor, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                </div>
                {item.addons.length > 0 && (
                  <div style={{ fontSize: 12, color: '#6C757D', marginTop: 4 }}>
                    {item.addons.map(a => a.name).join(', ')}
                  </div>
                )}
                {item.observation && (
                  <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2, fontStyle: 'italic' }}>
                    Obs: {item.observation}
                  </div>
                )}
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
            {getDiscount() > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 14, color: '#6C757D' }}>Cupom {couponApplied ? '(' + couponApplied.code + ')' : ''}</span>
                <span style={{ fontSize: 14, color: '#00B894' }}>- R$ {getDiscount().toFixed(2)}</span>
              </div>
            )}
            {getCashbackApplied() > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 14, color: '#6C757D' }}>Cashback usado</span>
                <span style={{ fontSize: 14, color: '#00B894' }}>- R$ {getCashbackApplied().toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: '1px solid #E9ECEF', marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: cor }}>
                R$ {tableNumber ? Math.max(0, getSubtotal() - getDiscount()).toFixed(2) : getTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {!tableNumber && (
            <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>CUPOM DE DESCONTO</div>
              {couponApplied ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#00B894' }}>✓ {couponApplied.code} aplicado</span>
                  <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remover</button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" placeholder="Código do cupom" value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
                    <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                      style={{ padding: '10px 18px', background: cor, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {couponLoading ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {couponError && <p style={{ color: '#e53935', fontSize: 12, margin: '8px 0 0' }}>{couponError}</p>}
                </div>
              )}
            </div>
          )}

          {!tableNumber && tenant.cashback_enabled && cashbackBalance > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>💰 Usar cashback (saldo: R$ {cashbackBalance.toFixed(2)})</span>
                <input type="checkbox" checked={useCashback} onChange={e => setUseCashback(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }} />
              </label>
            </div>
          )}

          {!tableNumber && (
            <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>QUANDO VOCÊ QUER RECEBER?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: deliveryTiming === 'scheduled' ? 12 : 0 }}>
                {['now', 'scheduled'].map(timing => (
                  <button key={timing} onClick={() => setDeliveryTiming(timing)}
                    style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: deliveryTiming === timing ? '2px solid ' + cor : '1px solid #E9ECEF', background: deliveryTiming === timing ? cor + '15' : '#fff', color: deliveryTiming === timing ? cor : '#6C757D' }}>
                    {timing === 'now' ? 'Assim que possível' : 'Agendar'}
                  </button>
                ))}
              </div>
              {deliveryTiming === 'scheduled' && (
                <input type="datetime-local" value={scheduledFor}
                  min={new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
                  onChange={e => setScheduledFor(e.target.value)}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
          )}

          {tableNumber ? (
            <button onClick={handleSubmitOrder} disabled={submitting}
              style={{ width: '100%', padding: '14px', background: cor, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              {submitting ? 'Enviando pedido...' : 'Confirmar pedido — R$ ' + Math.max(0, getSubtotal() - getDiscount()).toFixed(2)}
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
                  <p style={{ color: cor, fontSize: 12, margin: '0 0 10px', fontWeight: 600 }}>
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
                      style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: form.payment_method === method ? '2px solid ' + cor : '1px solid #E9ECEF', background: form.payment_method === method ? cor + '15' : '#fff', color: form.payment_method === method ? cor : '#6C757D' }}>
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
                style={{ width: '100%', padding: '14px', background: cor, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                {submitting ? 'Enviando pedido...' : 'Confirmar pedido — R$ ' + getTotal().toFixed(2)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}