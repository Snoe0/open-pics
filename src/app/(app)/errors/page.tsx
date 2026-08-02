import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/types'
import { ErrorsManager } from '@/components/errors/ErrorsManager'

const ErrorsPage = async () => {
  const profile = await getCurrentProfile()
  if (!profile || !isAdmin(profile.role)) redirect('/')
  return <ErrorsManager />
}

export default ErrorsPage
