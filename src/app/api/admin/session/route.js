import { isAdminRequest } from '@/lib/adminAuth'

export async function GET(request) {
  return Response.json({ authenticated: isAdminRequest(request) })
}
