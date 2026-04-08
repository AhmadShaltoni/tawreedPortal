import { Send } from 'lucide-react'
import { ComposeNotificationForm } from './ComposeNotificationForm'

export default function NewNotificationPage() {
  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Send className="w-8 h-8 text-blue-900" />
        <div>
          <h1 className="text-2xl font-bold text-blue-900">إرسال إشعار جديد</h1>
          <p className="text-sm text-gray-600">إنشاء وإرسال إشعار للمستخدمين</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ComposeNotificationForm />
      </div>
    </div>
  )
}
