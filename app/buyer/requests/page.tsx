import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { Button, Card, CardContent, StatusBadge } from '@/components/ui'
import { getBuyerRequests } from '@/actions/requests'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/types'

export default async function BuyerRequestsPage() {
  const requests = await getBuyerRequests()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-600">Manage your purchase requests</p>
        </div>
        <Link href="/buyer/requests/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Request List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No requests yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first purchase request and start receiving offers from suppliers
            </p>
            <Link href="/buyer/requests/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Request
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Link key={request.id} href={`/buyer/requests/${request.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2">{request.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Product:</span> {request.productName}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Qty:</span> {request.quantity} {request.unit}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Category:</span> {CATEGORY_LABELS[request.category]}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Delivery:</span> {request.deliveryCity}
                        </span>
                        {request.maxBudget && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Budget:</span> {formatCurrency(request.maxBudget)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-6">
                      <div className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-sm font-medium">
                        {request.offers.length} {request.offers.length === 1 ? 'offer' : 'offers'}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Created {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
