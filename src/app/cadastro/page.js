'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Cadastro() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function generateSlug(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async function handleCadastro() {
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError('Erro ao criar conta: ' + authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user.id
    const slug = generateSlug(restaurantName)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: restaurantName, slug })
      .select()
      .single()

    if (tenantError) {
      setError('Erro ao criar restaurante: ' + tenantError.message)
      setLoading(false)
      return
    }

    await supabase.from('users').insert({ id: userId, tenant_id: tenant.id, email, name })
    await supabase.from('subscriptions').insert({ tenant_id: tenant.id })

    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: '#1A1A2E', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
  <img src="/nexar.png" alt="Nexar" style={{ width: 36, height: 36, objectFit: 'contain' }} />
</div>
<h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Nexar - Cardápio Digital</h1>
<p style={{ color: '#6C757D', fontSize: 14, margin: 0 }}>Crie sua conta gratuitamente</p>
        </div>

        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />

        <input
          type="text"
          placeholder="Nome do restaurante"
          value={restaurantName}
          onChange={e => setRestaurantName(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />

        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />

        <input
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
        />

        {error && <p style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          onClick={handleCadastro}
          disabled={loading}
          style={{ width: '100%', padding: '11px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          {loading ? 'Criando conta...' : 'Criar conta grátis'}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6C757D' }}>
          Já tem conta?{' '}
          <a href="/login" style={{ color: '#00B894', fontWeight: 600, textDecoration: 'none' }}>Entrar</a>
        </p>
      </div>
    </div>
  )
}