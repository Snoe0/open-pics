import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/types'
import { TeamManager } from '@/components/team/TeamManager'

const TeamPage = async () => {
  const profile = await getCurrentProfile()
  if (!profile || !isAdmin(profile.role)) redirect('/')
  return <TeamManager currentUserId={profile.id} />
}

export default TeamPage
