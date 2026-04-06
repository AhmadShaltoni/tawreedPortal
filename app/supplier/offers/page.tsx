import Link from 'next/link'
import { Package, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { Card, CardContent, Button, StatusBadge } from '@/components/ui'
import { getSupplierOffers } from '@/actions/offers'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function SupplierOffersPage() {
  const offers = await getSupplierOffers()

  const pendingOffers = offers.filter((o) => o.status === 'PENDING')
  const acceptedOffers = offers.filter((o) => o.status === 'ACCEPTED')
  const otherOffers = offers.filter((o) => !['PENDING', 'ACCEPTED'].includes(o.status))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Offers</h1>
        <p className="text-gray-600">Track your submitted offers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingOffers.length}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{acceptedOffers.length}</p>
              <p className="text-sm text-gray-600">Accepted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{otherOffers.length}</p>
              <p className="text-sm text-gray-600">Rejected/Expired</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No offers yet</h3>
            <p className="text-gray-600 mb-6">
              Browse available requests and submit your first offer
            </p>
            <Link href="/supplier/requests">
              <Button variant="secondary">
                Browse Requests
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pending Offers */}
          {pendingOffers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Pending Offers</h2>
              <div className="space-y-3">
                {pendingOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </div>
          )}

          {/* Accepted Offers */}
          {acceptedOffers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Accepted Offers</h2>
              <div className="space-y-3">
                {acceptedOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </div>
          )}

          {/* Other Offers */}
          {otherOffers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-500">Past Offers</h2>
              <div className="space-y-3">
                {otherOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OfferCard({ offer }: { offer: Awaited<ReturnType<typeof getSupplierOffers>>[0] }) {
  return (
    <Link href={`/supplier/requests/${offer.requestId}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-gray-900">{offer.request.title}</h3>
                <StatusBadge status={offer.status} />
              </div>
              <p className="text-sm text-gray-600">
                {offer.request.productName} • {offer.quantity} {offer.unit} • {offer.request.deliveryCity}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Submitted {formatDate(offer.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-blue-900">
                {formatCurrency(offer.totalPrice)}
              </p>
              <p className="text-sm text-gray-500">
                {formatCurrency(offer.pricePerUnit)}/unit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
