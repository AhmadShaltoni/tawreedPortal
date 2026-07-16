import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getLoyaltyConfig, getWelcomeBonusConfig, getReferralConfig } from '@/actions/loyalty-config'
import { ConfigClient } from './ConfigClient'
import { isAdminLike } from '@/lib/permissions'

export default async function LoyaltyConfigPage() {
  const session = await auth()

  if (!session?.user || !isAdminLike(session.user.role)) {
    redirect('/login')
  }

  const [configRes, welcomeRes, referralRes] = await Promise.all([
    getLoyaltyConfig(),
    getWelcomeBonusConfig(),
    getReferralConfig(),
  ])

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">إعدادات نظام الولاء</h1>
      <p className="text-gray-600 mb-8">تحكم بمعاملات النقاط ومكافأة الانضمام وبرنامج الدعوات — التعديلات تطبق فوراً</p>

      <ConfigClient
        config={configRes.success ? configRes.data : null}
        welcomeBonus={welcomeRes.success ? welcomeRes.data : null}
        referral={referralRes.success ? referralRes.data : null}
      />
    </div>
  )
}
