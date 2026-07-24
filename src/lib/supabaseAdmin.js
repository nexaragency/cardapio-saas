import { createClient } from '@supabase/supabase-js'

// Uso exclusivo em rotas de API server-side. Nunca importar em componentes 'use client'.
// SUPABASE_SERVICE_ROLE_KEY ignora RLS - so deve ser usada apos validar a requisicao.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
