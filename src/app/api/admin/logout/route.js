import { COOKIE_NAME } from '@/lib/adminAuth'

export async function POST() {
  const res = Response.json({ success: true })
  res.headers.append('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`)
  return res
}
