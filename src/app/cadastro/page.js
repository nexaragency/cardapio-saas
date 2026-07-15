'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function CadastroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteValid, setInviteValid] = useState(false)
  const [checkingInvite, setCheckingInvite] = useState(true)

  useEffect(() => {
    async function checkInvite() {
      const code = searchParams.get('convite')
      if (!code) {
        router.replace('/landing')
        return
      }

      const { data } = await supabase
        .from('invites')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('used', false)
        .single()

      if (data) {
        setInviteCode(code.toUpperCase())
        setInviteValid(true)
      } else {
        router.replace('/landing')
      }
      setCheckingInvite(false)
    }
    checkInvite()
  }, [])

  function generateSlug(text) {
    return text.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async function handleCadastro() {
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setError('Erro ao criar conta: ' + authError.message); setLoading(false); return }

    const userId = authData.user.id
    const slug = generateSlug(restaurantName)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants').insert({ name: restaurantName, slug }).select().single()
    if (tenantError) { setError('Erro ao criar restaurante: ' + tenantError.message); setLoading(false); return }

    await supabase.from('users').insert({ id: userId, tenant_id: tenant.id, email, name })

    await supabase.from('subscriptions').insert({
      tenant_id: tenant.id,
      status: 'trial',
      plan_name: 'premium',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    if (inviteCode) {
      await supabase.from('invites').update({
        used: true,
        used_at: new Date().toISOString(),
        used_by: tenant.id
      }).eq('code', inviteCode)
    }

    router.push('/dashboard')
  }

  if (checkingInvite) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Verificando convite...</p>
    </div>
  )

  if (!inviteValid) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, background: '#1A1A2E', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <img src="/nexar.png" alt="Nexar" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Nexar - Cardápio Digital</h1>
          <p style={{ color: '#6C757D', fontSize: 14, margin: 0 }}>Crie sua conta</p>
          {inviteCode && (
            <div style={{ marginTop: 10, background: '#E8F8F5', border: '1px solid #00B894', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#00B894', fontWeight: 600 }}>
              Convite válido — 30 dias de trial Premium
            </div>
          )}
        </div>

        <input type="text" placeholder="Seu nome" value={name}
          onChange={e => setName(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

        <input type="text" placeholder="Nome do restaurante" value={restaurantName}
          onChange={e => setRestaurantName(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

        <input type="email" placeholder="Seu e-mail" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

        <input type="password" placeholder="Senha (mínimo 6 caracteres)" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />

        {error && <p style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button onClick={handleCadastro} disabled={loading}
          style={{ width: '100%', padding: '11px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6C757D' }}>
          Já tem conta?{' '}
          <a href="/login" style={{ color: '#00B894', fontWeight: 600, textDecoration: 'none' }}>Entrar</a>
        </p>
      </div>
    </div>
  )
}

export default function Cadastro() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><p style={{ color: '#6C757D' }}>Carregando...</p></div>}>
      <CadastroForm />
    </Suspense>
  )
}