import { isValidAdminPassword, adminSessionToken, adminCookieOptions, COOKIE_NAME } from '@/lib/adminAuth'

export async function POST(request) {
  const { password } = await request.json()

  if (!isValidAdminPassword(password)) {
    return Response.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const res = Response.json({ success: true })
  res.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${adminSessionToken()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${adminCookieOptions().maxAge}`
  )
  return res
}
