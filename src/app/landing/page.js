'use client'

import { useRouter } from 'next/navigation'

export default function Landing() {
  const router = useRouter()

  const features = [
    {
      icon: '📱',
      title: 'Cardápio Digital',
      desc: 'Seu cardápio sempre atualizado, acessível por QR Code em qualquer celular. Sem baixar aplicativo.'
    },
    {
      icon: '🛵',
      title: 'Gestão de Delivery',
      desc: 'Receba pedidos com endereço, bairro e taxa de entrega calculada automaticamente.'
    },
    {
      icon: '🪑',
      title: 'Gestão do Salão',
      desc: 'QR Code individual por mesa. O pedido chega identificado sem o garçom precisar perguntar nada.'
    },
    {
      icon: '📋',
      title: 'Pedidos em Tempo Real',
      desc: 'Acompanhe cada pedido do recebimento até a entrega. Status atualizado automaticamente.'
    },
    {
      icon: '📊',
      title: 'Relatórios Completos',
      desc: 'Faturamento do dia, ticket médio, produtos mais vendidos e bairros com mais pedidos.'
    },
    {
      icon: '⚡',
      title: 'Configuração em Minutos',
      desc: 'Cadastre seu restaurante, adicione os produtos e compartilhe o link. Sem complicação.'
    }
  ]

  const plans = [
    {
      name: 'Starter',
      price: 59,
      desc: 'Ideal para quem está começando',
      features: [
        'Cardápio digital ilimitado',
        'Pedidos via delivery',
        'Relatórios básicos',
        'QR Code geral',
        'Suporte por e-mail'
      ]
    },
    {
      name: 'Pro',
      price: 99,
      desc: 'Para restaurantes com salão',
      highlight: true,
      features: [
        'Tudo do Starter',
        'Gestão do Salão completa',
        'QR Code por mesa',
        'Identificação automática de mesa',
        'Suporte prioritário'
      ]
    },
    {
      name: 'Premium',
      price: 149,
      desc: 'Para operações maiores',
      features: [
        'Tudo do Pro',
        'Múltiplos usuários',
        'Relatórios avançados',
        'Integração com impressora',
        'Suporte via WhatsApp'
      ]
    }
  ]

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#fff', color: '#1A1A2E' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E9ECEF', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1A1A2E', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <img src="/nexar.png" alt="Nexar" style={{ width: 28, height: 28, objectFit: 'contain' }} />
</div>
<span style={{ fontWeight: 700, fontSize: 18, color: '#1A1A2E' }}>Nexar - Cardápio Digital</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => router.push('/login')}
              style={{ padding: '8px 20px', background: 'transparent', border: '1px solid #E9ECEF', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#6C757D', fontWeight: 500 }}>
              Entrar
            </button>
            <button onClick={() => router.push('/cadastro')}
              style={{ padding: '8px 20px', background: '#00B894', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600 }}>
              Começar grátis
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: 'linear-gradient(180deg, #F0FDF9 0%, #fff 100%)', textAlign: 'center', padding: '140px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: '#E8F8F5', border: '1px solid #00B894', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#00B894', fontWeight: 600, marginBottom: 24 }}>
            7 dias grátis — sem cartão de crédito
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#1A1A2E', margin: '0 0 20px', lineHeight: 1.2 }}>
  O cardápio digital da Nexar para o seu restaurante
</h1>
          <p style={{ fontSize: 18, color: '#6C757D', margin: '0 0 40px', lineHeight: 1.6 }}>
            Delivery, salão e relatórios em um só lugar. Configure em minutos, receba pedidos em tempo real e cobre menos que a concorrência.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/cadastro')}
              style={{ padding: '14px 32px', background: '#00B894', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 16, color: '#fff', fontWeight: 700, boxShadow: '0 4px 20px rgba(0,184,148,0.3)' }}>
              Criar conta grátis
            </button>
            <button onClick={() => router.push('/cardapio/jokas-pizzaria')}
              style={{ padding: '14px 32px', background: '#fff', border: '1px solid #E9ECEF', borderRadius: 10, cursor: 'pointer', fontSize: 16, color: '#1A1A2E', fontWeight: 600 }}>
              Ver demonstração
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#adb5bd', marginTop: 16 }}>Sem fidelidade. Cancele quando quiser.</p>
        </div>
      </section>

      {/* DOR */}
      <section style={{ padding: '80px 24px', background: '#F8F9FA' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 16px' }}>Cansado de pagar caro por um sistema complicado?</h2>
          <p style={{ fontSize: 16, color: '#6C757D', margin: '0 0 48px', lineHeight: 1.7 }}>
            O Anota Aí cobra R$ 199/mês pelo plano básico. O iFood te engole na comissão. E você ainda precisa de um sistema separado para o salão. O QRDápio resolve tudo isso por menos da metade do preço.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {[
              { label: 'Anota Aí Basic', price: 'R$ 199/mês', color: '#e53935' },
              { label: 'QRDápio Pro', price: 'R$ 99/mês', color: '#00B894', highlight: true },
              { label: 'iFood + sistema', price: 'R$ 300+/mês', color: '#e53935' }
            ].map(item => (
              <div key={item.label} style={{
                background: item.highlight ? '#00B894' : '#fff',
                border: item.highlight ? 'none' : '1px solid #E9ECEF',
                borderRadius: 12, padding: '24px 20px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: item.highlight ? 'rgba(255,255,255,0.8)' : '#6C757D', marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: item.highlight ? '#fff' : item.color }}>{item.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>Tudo que seu negócio precisa</h2>
            <p style={{ fontSize: 16, color: '#6C757D', margin: 0 }}>De delivery a salão, do cardápio aos relatórios — em um só sistema.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {features.map(feature => (
              <div key={feature.title} style={{ background: '#F8F9FA', borderRadius: 12, padding: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{feature.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E', marginBottom: 8 }}>{feature.title}</div>
                <div style={{ fontSize: 14, color: '#6C757D', lineHeight: 1.6 }}>{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: '80px 24px', background: '#F8F9FA' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>Configure em menos de 5 minutos</h2>
          <p style={{ fontSize: 16, color: '#6C757D', margin: '0 0 56px' }}>Sem técnico, sem complicação.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            {[
              { step: '1', title: 'Crie sua conta', desc: 'Cadastro rápido e gratuito' },
              { step: '2', title: 'Monte o cardápio', desc: 'Adicione produtos e fotos' },
              { step: '3', title: 'Compartilhe o link', desc: 'QR Code gerado na hora' },
              { step: '4', title: 'Receba pedidos', desc: 'Em tempo real no painel' }
            ].map(item => (
              <div key={item.step} style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: '#00B894', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontSize: 20, fontWeight: 700 }}>
                  {item.step}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E', marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#6C757D' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREÇOS */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px' }}>Planos simples e transparentes</h2>
            <p style={{ fontSize: 16, color: '#6C757D', margin: 0 }}>7 dias grátis em todos os planos. Sem cartão de crédito.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {plans.map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? '#00B894' : '#fff',
                border: plan.highlight ? 'none' : '1px solid #E9ECEF',
                borderRadius: 16, padding: 32, position: 'relative'
              }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    MAIS POPULAR
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: plan.highlight ? '#fff' : '#1A1A2E', marginBottom: 4 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#6C757D' }}>{plan.desc}</div>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: plan.highlight ? '#fff' : '#1A1A2E' }}>R$ {plan.price}</span>
                  <span style={{ fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#6C757D' }}>/mês</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {plan.features.map(feature => (
                    <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 18, height: 18, background: plan.highlight ? 'rgba(255,255,255,0.2)' : '#E8F8F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: plan.highlight ? '#fff' : '#00B894', fontWeight: 700, flexShrink: 0 }}>✓</div>
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.9)' : '#6C757D' }}>{feature}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => router.push('/cadastro')}
                  style={{ width: '100%', padding: '12px', background: plan.highlight ? '#fff' : '#00B894', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: plan.highlight ? '#00B894' : '#fff' }}>
                  Começar grátis
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '80px 24px', background: '#00B894', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>
            Comece hoje, grátis por 7 dias
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', margin: '0 0 36px' }}>
            Sem cartão de crédito. Sem fidelidade. Cancele quando quiser.
          </p>
          <button onClick={() => router.push('/cadastro')}
            style={{ padding: '16px 48px', background: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#00B894', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            Criar conta grátis agora
          </button>
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
          Desenvolvido por Nexar Agency
        </p>
      </footer>

    </div>
  )
}