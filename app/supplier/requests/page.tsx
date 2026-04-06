import Link from 'next/link'
import { FileText, MapPin, Clock } from 'lucide-react'
import { Card, CardContent, StatusBadge } from '@/components/ui'
import { getAvailableRequests } from '@/actions/requests'
import { formatCurrency, daysUntil } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/types'

export default async function SupplierRequestsPage() {
  const requests = await getAvailableRequests()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse Requests</h1>
        <p className="text-gray-600">Find opportunities and submit your offers</p>
      </div>

      {/* Request List */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No open requests</h3>
            <p className="text-gray-600">
              Check back later for new opportunities from buyers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const daysLeft = daysUntil(request.expiresAt)
            
            return (
              <Link key={request.id} href={`/supplier/requests/${request.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                          <StatusBadge status={request.status} />
                        </div>
                        {request.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2">{request.description}</p>
                        )}
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-900" />
                            </div>
                            <div>
                              <p className="text-gray-500">Product</p>
                              <p className="font-medium">{request.productName}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <span className="text-green-600 font-bold text-sm">{request.quantity}</span>
                            </div>
                            <div>
                              <p className="text-gray-500">Quantity</p>
                              <p className="font-medium">{request.quantity} {request.unit}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                              <p className="text-gray-500">Delivery</p>
                              <p className="font-medium">{request.deliveryCity}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                              <span className="text-purple-600 text-xs font-bold">CAT</span>
                            </div>
                            <div>
                              <p className="text-gray-500">Category</p>
                              <p className="font-medium">{CATEGORY_LABELS[request.category]}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-6 flex flex-col items-end gap-2">
                        {request.maxBudget && (
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Budget: {formatCurrency(request.maxBudget)}
                          </div>
                        )}
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          daysLeft <= 2 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {daysLeft} days left
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {request.offers.length} offer{request.offers.length !== 1 ? 's' : ''} submitted
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
