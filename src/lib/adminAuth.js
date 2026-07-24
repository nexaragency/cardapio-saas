import { createHmac, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'nexar_admin_session'

function expectedToken() {
  return createHmac('sha256', process.env.ADMIN_PASSWORD || '')
    .update('nexar-admin-session')
    .digest('hex')
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8
  }
}

export { COOKIE_NAME }

export function isValidAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || !password) return false
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function adminSessionToken() {
  return expectedToken()
}

export function isAdminRequest(request) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value
  if (!cookie) return false
  const a = Buffer.from(cookie)
  const b = Buffer.from(expectedToken())
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
