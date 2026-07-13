import { db } from '@/lib/db'

/**
 * Active campaigns with the given user's progress attached.
 * Callers (server action / mobile API route) are responsible for auth.
 */
export async function getActiveCampaignsForUser(userId: string) {
  const now = new Date()
  const campaigns = await db.loyaltyCampaign.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      userProgress: {
        where: { userId },
      },
    },
    orderBy: { startDate: 'desc' },
  })

  return campaigns.map((campaign) => ({
    ...campaign,
    userProgress: campaign.userProgress[0] || null,
  }))
}
