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

    // 1. Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    if (authError) {
      setError('Erro ao criar conta: ' + authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user.id
    const slug = generateSlug(restaurantName)

    // 2. Cria o tenant (restaurante)
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

    // 3. Cria o usuário vinculado ao tenant
    await supabase
      .from('users')
      .insert({ id: userId, tenant_id: tenant.id, email, name })

    // 4. Cria a subscription trial
    await supabase
      .from('subscriptions')
      .insert({ tenant_id: tenant.id })

    router.push('/dashboard')
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1>Criar conta</h1>

      <input
        type="text"
        placeholder="Seu nome"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />

      <input
        type="text"
        placeholder="Nome do restaurante"
        value={restaurantName}
        onChange={e => setRestaurantName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />

      <input
        type="email"
        placeholder="Seu e-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        onClick={handleCadastro}
        disabled={loading}
        style={{ width: '100%', padding: 10, background: '#FF6B00', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        Já tem conta? <a href="/login">Entrar</a>
      </p>
    </div>
  )
}