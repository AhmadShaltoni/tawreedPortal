'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { acceptOffer, rejectOffer } from '@/actions/offers'

interface OfferActionsProps {
  offerId: string
}

export function OfferActions({ offerId }: OfferActionsProps) {
  const router = useRouter()
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  async function handleAccept() {
    setIsAccepting(true)
    const result = await acceptOffer(offerId)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to accept offer')
      setIsAccepting(false)
    }
  }

  async function handleReject() {
    setIsRejecting(true)
    const result = await rejectOffer(offerId)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to reject offer')
      setIsRejecting(false)
    }
  }

  return (
    <div className="flex gap-2 pt-3 border-t border-gray-200">
      <Button
        size="sm"
        onClick={handleAccept}
        isLoading={isAccepting}
        disabled={isRejecting}
      >
        Accept Offer
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleReject}
        isLoading={isRejecting}
        disabled={isAccepting}
      >
        Reject
      </Button>
    </div>
  )
}
