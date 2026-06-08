'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Configuracoes() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
const [logoPreview, setLogoPreview] = useState(null)
  const [form, setForm] = useState({
    name: '', phone: '', slug: '', city: '',
    open_time: '18:00', close_time: '23:00'
  })

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('*, tenants(*)').eq('id', user.id).single()
      if (userData && userData.tenants) {
        setTenantId(userData.tenants.id)
        setForm({
          name: userData.tenants.name || '',
          phone: userData.tenants.phone || '',
          slug: userData.tenants.slug || '',
          city: userData.tenants.city || '',
          open_time: userData.tenants.open_time || '18:00',
          close_time: userData.tenants.close_time || '23:00'
        })
        if (userData.tenants.banner_url) {
          setBannerPreview(userData.tenants.banner_url)
        }
        if (userData.tenants.logo_url) {
  setLogoPreview(userData.tenants.logo_url)
}
      }
      setLoading(false)
    }
    loadData()
  }, [])

  function handleBannerChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function uploadBanner(file) {
    const ext = file.name.split('.').pop()
    const filename = 'banner_' + tenantId + '.' + ext
    const { error } = await supabase.storage
      .from('produtos')
      .upload(filename, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('produtos').getPublicUrl(filename)
    return data.publicUrl
  }
  async function uploadLogo(file) {
  const ext = file.name.split('.').pop()
  const filename = 'logo_' + tenantId + '.' + ext
  const { error } = await supabase.storage
    .from('produtos')
    .upload(filename, file, { upsert: true })
  if (error) return null
  const { data } = supabase.storage.from('produtos').getPublicUrl(filename)
  return data.publicUrl
}

function handleLogoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  setLogoFile(file)
  setLogoPreview(URL.createObjectURL(file))
}

  async function handleSave() {
    setSaving(true)
    setSuccess(false)

    let bannerUrl = null
    if (bannerFile) {
      bannerUrl = await uploadBanner(bannerFile)
    }
    let logoUrl = null
if (logoFile) {
  logoUrl = await uploadLogo(logoFile)
}

    const update = {
      name: form.name,
      phone: form.phone,
      city: form.city,
      open_time: form.open_time,
      close_time: form.close_time
    }

    if (bannerUrl) update.banner_url = bannerUrl
    if (logoUrl) update.logo_url = logoUrl

    const { error } = await supabase
      .from('tenants').update(update).eq('id', tenantId)

    if (!error) setSuccess(true)
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  const cardapioUrl = 'https://cardapio-saas-virid.vercel.app/cardapio/' + form.slug

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Configurações</h1>
        <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Gerencie os dados do seu restaurante</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>BANNER DO CARDÁPIO</div>
        <label style={{
          display: 'block', cursor: 'pointer',
          borderRadius: 10, overflow: 'hidden',
          border: '2px dashed #E9ECEF',
          background: '#F8F9FA',
          marginBottom: 8
        }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 20 }}>
  <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>LOGO DO RESTAURANTE</div>
  <label style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
    <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
    {logoPreview ? (
      <img src={logoPreview} alt="logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, border: '2px solid #E9ECEF' }} />
    ) : (
      <div style={{ width: 80, height: 80, background: '#F8F9FA', borderRadius: 12, border: '2px dashed #E9ECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
        🖼️
      </div>
    )}
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>
        {logoPreview ? 'Clique para trocar a logo' : 'Clique para adicionar a logo'}
      </div>
      <div style={{ fontSize: 12, color: '#6C757D' }}>Recomendado: imagem quadrada 200x200px</div>
    </div>
  </label>
</div>
          <input type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
          {bannerPreview ? (
            <img src={bannerPreview} alt="banner" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 32 }}>🖼️</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Clique para adicionar banner</div>
              <div style={{ fontSize: 12, color: '#6C757D' }}>Recomendado: 1200x300px</div>
            </div>
            
          )}
        </label>
        {bannerPreview && (
          <p style={{ fontSize: 12, color: '#6C757D', margin: 0 }}>Clique na imagem para trocar o banner</p>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>DADOS DO RESTAURANTE</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Nome do restaurante</label>
          <input type="text" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Cidade</label>
          <input type="text" placeholder="Ex: Sarandi - PR" value={form.city}
            onChange={e => setForm({ ...form, city: e.target.value })}
            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Número do WhatsApp</label>
          <input type="text" placeholder="Ex: 45999887766" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
          />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6C757D' }}>Formato: DDD + número. Ex: 45999887766</p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>HORÁRIO DE FUNCIONAMENTO</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Abre às</label>
            <input type="time" value={form.open_time}
              onChange={e => setForm({ ...form, open_time: e.target.value })}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Fecha às</label>
            <input type="time" value={form.close_time}
              onChange={e => setForm({ ...form, close_time: e.target.value })}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6C757D' }}>
          O cardápio mostrará automaticamente se o restaurante está aberto ou fechado.
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>SEU CARDÁPIO PÚBLICO</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, padding: '10px 14px', background: '#F8F9FA', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, color: '#1A1A2E', wordBreak: 'break-all' }}>
            {cardapioUrl}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(cardapioUrl)}
            style={{ padding: '10px 16px', background: '#F0F4FF', color: '#4A6CF7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Copiar link
          </button>
        </div>
      </div>

      {success && (
        <div style={{ background: '#E8F8F5', border: '1px solid #00B894', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#00B894', fontWeight: 600 }}>
          Salvo com sucesso!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ padding: '12px 32px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
      >
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </div>
  )
}