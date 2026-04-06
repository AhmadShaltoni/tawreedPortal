import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Package, DollarSign, User } from 'lucide-react'
import { Button, Card, CardHeader, CardContent, StatusBadge } from '@/components/ui'
import { getRequestById } from '@/actions/requests'
import { formatDate, formatCurrency, daysUntil } from '@/lib/utils'
import { CATEGORY_LABELS, UNIT_LABELS } from '@/types'
import { OfferActions } from './OfferActions'

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const request = await getRequestById(id)

  if (!request) {
    notFound()
  }

  const pendingOffers = request.offers.filter((o) => o.status === 'PENDING')
  const daysLeft = daysUntil(request.expiresAt)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/buyer/requests" className="inline-flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to requests
      </Link>

      {/* Request Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-gray-600">{request.description}</p>
        </div>
        {request.status === 'OPEN' && daysLeft > 0 && (
          <div className="text-right">
            <span className="text-sm text-gray-500">Expires in</span>
            <p className="text-lg font-semibold text-orange-600">{daysLeft} days</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Request Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Product Details</h2>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-900" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="font-medium">{request.productName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold">#</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-medium">{request.quantity} {UNIT_LABELS[request.unit]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-sm font-bold">CAT</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{CATEGORY_LABELS[request.category]}</p>
                  </div>
                </div>
                {request.brand && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-sm font-bold">BR</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Preferred Brand</p>
                      <p className="font-medium">{request.brand}</p>
                    </div>
                  </div>
                )}
                {request.specifications && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Specifications</p>
                    <p className="font-medium">{request.specifications}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Delivery Information</h2>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Delivery City</p>
                    <p className="font-medium">{request.deliveryCity}</p>
                  </div>
                </div>
                {request.deliveryAddress && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Full Address</p>
                      <p className="font-medium">{request.deliveryAddress}</p>
                    </div>
                  </div>
                )}
                {request.deliveryDeadline && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Delivery Deadline</p>
                      <p className="font-medium">{formatDate(request.deliveryDeadline)}</p>
                    </div>
                  </div>
                )}
                {request.maxBudget && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Maximum Budget</p>
                      <p className="font-medium">{formatCurrency(request.maxBudget)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Offers Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Offers Received ({request.offers.length})
                </h2>
                {pendingOffers.length > 0 && (
                  <span className="text-sm text-orange-600">
                    {pendingOffers.length} pending decision
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {request.offers.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No offers received yet</p>
                  <p className="text-sm text-gray-400">
                    Suppliers will start submitting offers soon
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {request.offers.map((offer) => (
                    <div
                      key={offer.id}
                      className={`p-4 rounded-lg border ${
                        offer.status === 'ACCEPTED'
                          ? 'border-green-200 bg-green-50'
                          : offer.status === 'PENDING'
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">{offer.supplier.businessName || offer.supplier.name}</p>
                            <p className="text-sm text-gray-500">{offer.supplier.city}</p>
                          </div>
                        </div>
                        <StatusBadge status={offer.status} />
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-500">Price per Unit</p>
                          <p className="font-semibold">{formatCurrency(offer.pricePerUnit)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Price</p>
                          <p className="font-semibold text-lg">{formatCurrency(offer.totalPrice)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Delivery</p>
                          <p className="font-medium">{offer.deliveryDays} days</p>
                        </div>
                      </div>

                      {offer.notes && (
                        <p className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Notes:</span> {offer.notes}
                        </p>
                      )}

                      {offer.status === 'PENDING' && request.status !== 'CLOSED' && (
                        <OfferActions offerId={offer.id} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Request Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <StatusBadge status={request.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="text-sm">{formatDate(request.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Expires</span>
                  <span className="text-sm">{formatDate(request.expiresAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Offers</span>
                  <span className="font-medium">{request.offers.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Info (if accepted) */}
          {request.order && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-green-600">Order Created</h3>
                <p className="text-sm text-gray-600 mb-4">
                  An order has been created for this request.
                </p>
                <Link href={`/buyer/orders/${request.order.id}`}>
                  <Button className="w-full">View Order</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
