'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1>Entrar</h1>

      <input
        type="email"
        placeholder="Seu e-mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />

      <input
        type="password"
        placeholder="Sua senha"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
      />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ width: '100%', padding: 10, background: '#FF6B00', color: '#fff', border: 'none', cursor: 'pointer' }}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        Não tem conta? <a href="/cadastro">Cadastre-se</a>
      </p>
    </div>
  )
}