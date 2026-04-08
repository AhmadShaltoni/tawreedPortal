import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Package, DollarSign, Clock, Store } from 'lucide-react'
import { Card, CardHeader, CardContent, StatusBadge } from '@/components/ui'
import { getRequestById } from '@/actions/requests'
import { formatDate, formatCurrency, daysUntil } from '@/lib/utils'
import { CATEGORY_LABELS, UNIT_LABELS } from '@/types'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SubmitOfferForm } from './SubmitOfferForm'

export default async function SupplierRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const request = await getRequestById(id)

  if (!request) {
    notFound()
  }

  // Check if supplier already submitted an offer
  const existingOffer = session?.user 
    ? await db.offer.findUnique({
        where: {
          requestId_supplierId: {
            requestId: id,
            supplierId: session.user.id,
          },
        },
      })
    : null

  const daysLeft = daysUntil(request.expiresAt)
  const isExpired = daysLeft <= 0
  const canSubmitOffer = !existingOffer && !isExpired && request.status === 'OPEN'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <Link href="/supplier/requests" className="inline-flex items-center text-gray-600 hover:text-gray-900">
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
        <div className="text-right flex flex-col items-end gap-2">
          {!isExpired ? (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              daysLeft <= 2 
                ? 'bg-red-100 text-red-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              <Clock className="w-4 h-4 inline mr-1" />
              {daysLeft} days left
            </div>
          ) : (
            <div className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">
              Expired
            </div>
          )}
        </div>
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
                    <p className="text-sm text-gray-500">Quantity Needed</p>
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
              <h2 className="text-lg font-semibold">Delivery Requirements</h2>
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
                      <p className="text-sm text-gray-500">Buyer&apos;s Max Budget</p>
                      <p className="font-medium text-emerald-600">{formatCurrency(request.maxBudget)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Buyer Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Buyer Information</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <Store className="w-7 h-7 text-blue-900" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{request.buyer.storeName || request.buyer.username}</p>
                  <p className="text-gray-600">{request.buyer.city}</p>
                  <p className="text-sm text-gray-400">
                    Member since {formatDate(request.buyer.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Submit Offer */}
        <div className="space-y-6">
          {existingOffer ? (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Your Offer</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <StatusBadge status={existingOffer.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price/Unit</span>
                    <span className="font-medium">{formatCurrency(existingOffer.pricePerUnit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Price</span>
                    <span className="font-semibold text-lg">{formatCurrency(existingOffer.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium">{existingOffer.deliveryDays} days</span>
                  </div>
                </div>
                <Link href="/supplier/offers">
                  <p className="text-sm text-blue-900 hover:underline text-center">
                    View in My Offers →
                  </p>
                </Link>
              </CardContent>
            </Card>
          ) : canSubmitOffer ? (
            <SubmitOfferForm 
              requestId={request.id} 
              requestUnit={request.unit}
              requestQuantity={request.quantity}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">
                  {isExpired 
                    ? 'This request has expired' 
                    : 'You cannot submit an offer for this request'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Request Stats */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Request Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Posted</span>
                  <span className="text-sm">{formatDate(request.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Expires</span>
                  <span className="text-sm">{formatDate(request.expiresAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Offers Submitted</span>
                  <span className="font-medium">{request.offers.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
