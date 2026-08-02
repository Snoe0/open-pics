import type { Role } from '@/lib/types'

export const ROLE_OPTIONS: Role[] = ['admin', 'editor', 'viewer']

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const readApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json()
    return typeof body.error === 'string' ? body.error : `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}
