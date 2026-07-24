import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { slug, phone } = await request.json()
    if (!slug || !phone || phone.length < 8) {
      return Response.json({ customer: null })
    }

    const supabase = supabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants').select('id').eq('slug', slug).single()
    if (!tenant) return Response.json({ customer: null })

    const { data: customer } = await supabase
      .from('customers').select('name, address, neighborhood, city')
      .eq('tenant_id', tenant.id).eq('phone', phone).single()

    return Response.json({ customer: customer || null })
  } catch (error) {
    return Response.json({ customer: null })
  }
}
