'use client'

import { useState } from 'react'

export default function Landing() {
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe() {
    if (!name.trim()) { setError('Informe seu nome'); return }
    if (!email.trim()) { setError('Informe seu e-mail'); return }
    if (!password.trim()) { setError('Crie uma senha'); return }
    if (!cpfCnpj.trim()) { setError('Informe o CPF ou CNPJ'); return }
    setProcessing(true)
    setError('')

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setError('Erro: ' + authError.message); setProcessing(false); return }

    const userId = authData.user.id
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants').insert({ name, slug }).select().single()
    if (tenantError) { setError('Erro ao criar conta: ' + tenantError.message); setProcessing(false); return }

    await supabase.from('users').insert({ id: userId, tenant_id: tenant.id, email, name })
    await supabase.from('subscriptions').insert({ tenant_id: tenant.id, status: 'pending', plan_name: 'premium' })

    const res = await fetch('/api/asaas/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        plan_name: 'premium',
        email,
        name,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        phone: phone.replace(/\D/g, '')
      })
    })

    const data = await res.json()
    if (data.error) { setError('Erro no pagamento: ' + data.error); setProcessing(false); return }

    window.location.href = data.payment_url
  }

  const features = [
    { icon: '📱', title: 'Cardápio Digital', desc: 'Seu cardápio sempre atualizado, acessível por QR Code em qualquer celular. Sem baixar aplicativo.' },
    { icon: '🛵', title: 'Gestão de Delivery', desc: 'Receba pedidos com endereço, bairro e taxa de entrega calculada automaticamente.' },
    { icon: '🪑', title: 'Gestão do Salão', desc: 'QR Code individual por mesa. O pedido chega identificado sem o garçom precisar perguntar nada.' },
    { icon: '📋', title: 'Pedidos em Tempo Real', desc: 'Acompanhe cada pedido do recebimento até a entrega. Status atualizado automaticamente.' },
    { icon: '📊', title: 'Relatórios Completos', desc: 'Faturamento do dia, ticket médio, produtos mais vendidos e bairros com mais pedidos.' },
    { icon: '⚡', title: 'Configure em Minutos', desc: 'Cadastre seu restaurante, adicione os produtos e compartilhe o link. Sem complicação.' }
  ]

  const COMPARATIVO = [
    { recurso: 'Cardápio digital', nexar: true, anotaai: true, ifood: true },
    { recurso: 'Gestão de delivery', nexar: true, anotaai: true, ifood: true },
    { recurso: 'Gestão do salão com QR Code por mesa', nexar: true, anotaai: false, ifood: false },
    { recurso: 'Pedidos em tempo real', nexar: true, anotaai: true, ifood: false },
    { recurso: 'Sem comissão por pedido', nexar: true, anotaai: true, ifood: false },
    { recurso: 'Acompanhamento do pedido pelo cliente', nexar: true, anotaai: false, ifood: false },
    { recurso: 'Relatórios completos', nexar: true, anotaai: false, ifood: false },
    { recurso: 'Pagamento único — sem mensalidade', nexar: true, anotaai: false, ifood: false },
  ]

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#fff', color: '#1A1A2E' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E9ECEF', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1A1A2E', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/nexar.png" alt="Nexar" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#1A1A2E' }}>Nexar - Cardápio Digital</span>
          </div>
          <a href="/login" style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #E9ECEF', borderRadius: 8, fontSize: 14, color: '#6C757D', fontWeight: 500, textDecoration: 'none' }}>
            Já sou cliente
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 140, paddingBottom: 80, background: 'linear-gradient(180deg, #F0FDF9 0%, #fff 100%)', textAlign: 'center', padding: '140px 24px 80px' }}>
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1A1A2E', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 28 }}>
            <img src="/nexar.png" alt="Nexar" style={{ width: 16, height: 16, objectFit: 'contain' }} />
            Nexar Agency
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: '#1A1A2E', margin: '0 0 20px', lineHeight: 1.15 }}>
            Cardápio digital profissional por apenas <span style={{ color: '#00B894' }}>R$ 197</span>
          </h1>
          <p style={{ fontSize: 18, color: '#6C757D', margin: '0 0 16px', lineHeight: 1.7 }}>
            Pagamento único, sem mensalidade. Delivery, salão e relatórios em um só lugar.
          </p>
          <p style={{ fontSize: 15, color: '#00B894', fontWeight: 600, margin: 0 }}>
            Desenvolvido pela Nexar Agency — tecnologia feita para o seu negócio crescer.
          </p>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>Tudo que seu negócio precisa</h2>
            <p style={{ fontSize: 16, color: '#6C757D', margin: 0 }}>De delivery a salão, do cardápio aos relatórios — em um só sistema.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: '#F8F9FA', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#6C757D', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARATIVO */}
      <section style={{ padding: '80px 24px', background: '#F8F9FA' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>Por que a Nexar?</h2>
            <p style={{ fontSize: 16, color: '#6C757D', margin: 0 }}>Compare e veja a diferença.</p>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E9ECEF' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#1A1A2E', padding: '16px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Recurso</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#00B894', textAlign: 'center' }}>Nexar</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Anota Aí</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>iFood</div>
            </div>
            {COMPARATIVO.map((row, i) => (
              <div key={row.recurso} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '14px 24px', borderBottom: i < COMPARATIVO.length - 1 ? '1px solid #F8F9FA' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <div style={{ fontSize: 14, color: '#1A1A2E', fontWeight: 500 }}>{row.recurso}</div>
                <div style={{ textAlign: 'center', fontSize: 18 }}>{row.nexar ? '✅' : '❌'}</div>
                <div style={{ textAlign: 'center', fontSize: 18 }}>{row.anotaai ? '✅' : '❌'}</div>
                <div style={{ textAlign: 'center', fontSize: 18 }}>{row.ifood ? '✅' : '❌'}</div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '16px 24px', background: '#E8F8F5' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Preço</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#00B894', textAlign: 'center' }}>R$ 197 único</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e53935', textAlign: 'center' }}>R$ 119+/mês</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e53935', textAlign: 'center' }}>Comissão</div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>Como funciona</h2>
          <p style={{ fontSize: 16, color: '#6C757D', margin: '0 0 56px' }}>Configure em menos de 5 minutos.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            {[
              { step: '1', title: 'Adquira o sistema', desc: 'Pagamento único de R$ 197' },
              { step: '2', title: 'Monte o cardápio', desc: 'Adicione categorias, produtos e fotos' },
              { step: '3', title: 'Compartilhe o QR Code', desc: 'Gerado automaticamente na hora' },
              { step: '4', title: 'Receba pedidos', desc: 'Em tempo real no seu painel' }
            ].map(item => (
              <div key={item.step} style={{ textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, background: '#00B894', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontSize: 22, fontWeight: 700 }}>
                  {item.step}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E', marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#6C757D', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHECKOUT */}
      <section style={{ padding: '80px 24px', background: '#F8F9FA' }} id="adquirir">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 12px' }}>Adquira agora</h2>
            <p style={{ fontSize: 16, color: '#6C757D', margin: 0 }}>Pagamento único de <strong style={{ color: '#00B894' }}>R$ 197</strong>. Sem mensalidade. Sem fidelidade.</p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 32, marginBottom: 20 }}>
            <div style={{ background: '#E8F8F5', border: '1px solid #00B894', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#00B894', marginBottom: 8 }}>Nexar - Cardápio Digital</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  'Cardápio digital ilimitado',
                  'Gestão de delivery com taxa por bairro',
                  'Gestão do Salão + QR Code por mesa',
                  'Pedidos em tempo real',
                  'Relatórios completos + exportar PDF',
                  'Histórico de clientes',
                  'Personalização de cores',
                  'Seção de destaques',
                  'Suporte via chat'
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#00B894', fontSize: 12, fontWeight: 700 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#1A1A2E' }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #00B89430', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#6C757D' }}>Total</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#00B894' }}>R$ 197</span>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>SEUS DADOS</div>

            <input type="text" placeholder="Nome do restaurante *" value={name}
              onChange={e => setName(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

            <input type="email" placeholder="E-mail *" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

            <input type="password" placeholder="Crie uma senha *" value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

            <input type="text" placeholder="CPF ou CNPJ *" value={cpfCnpj}
              onChange={e => setCpfCnpj(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

            <input type="text" placeholder="Telefone com DDD (opcional)" value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />

            {error && (
              <div style={{ background: '#FFF5F5', border: '1px solid #e53935', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e53935' }}>
                {error}
              </div>
            )}

            <button onClick={handleSubscribe} disabled={processing}
              style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              {processing ? 'Processando...' : 'Adquirir por R$ 197'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#adb5bd', margin: '12px 0 0' }}>
              Pagamento seguro. Sem mensalidade. Sem fidelidade.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 24px', background: '#1A1A2E', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, background: '#fff', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/nexar.png" alt="Nexar" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Nexar - Cardápio Digital</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Desenvolvido pela Nexar Agency
        </p>
      </footer>

    </div>
  )
}