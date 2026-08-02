import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  return <AppShell profile={profile}>{children}</AppShell>
}

export default AppLayout
