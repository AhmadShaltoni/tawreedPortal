import Link from 'next/link'
import { 
  FileText, 
  Package, 
  TrendingUp, 
  DollarSign, 
  ArrowRight,
  CheckCircle,
  Eye
} from 'lucide-react'
import { Card, CardHeader, CardContent, Button, StatusBadge } from '@/components/ui'
import { getSupplierDashboardStats } from '@/actions/dashboard'
import { getAvailableRequests } from '@/actions/requests'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function SupplierDashboardPage() {
  const [stats, requests] = await Promise.all([
    getSupplierDashboardStats(),
    getAvailableRequests(),
  ])

  const recentRequests = requests.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-600">Here are the latest opportunities</p>
        </div>
        <Link href="/supplier/requests">
          <Button variant="secondary">
            <Eye className="w-4 h-4 mr-2" />
            Browse Requests
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Requests</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.availableRequests || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-900" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Submitted Offers</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.submittedOffers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accepted Offers</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.acceptedOffers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.activeOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest Requests</h2>
            <Link href="/supplier/requests" className="text-sm text-blue-900 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No open requests</h3>
              <p className="text-gray-600">Check back later for new opportunities</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/supplier/requests/${request.id}`}
                  className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{request.title}</h3>
                      <p className="text-sm text-gray-600">
                        {request.quantity} {request.unit} • {request.deliveryCity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {request.maxBudget && (
                        <p className="text-sm font-medium text-gray-900">
                          Budget: {formatCurrency(request.maxBudget)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(request.createdAt)}</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Completed Deliveries</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats?.completedOrders || 0}</p>
                <p className="text-gray-600">Orders delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/supplier/requests" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  Browse All Requests
                </Button>
              </Link>
              <Link href="/supplier/offers" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="w-4 h-4 mr-2" />
                  View My Offers
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
