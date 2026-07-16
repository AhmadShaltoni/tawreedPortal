'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck, Truck, UserCog, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { PERMISSION_CATALOG } from '@/lib/permissions'
import {
  createStaff,
  updateStaff,
  resetStaffPassword,
  toggleStaffActive,
  deleteStaff,
} from '@/actions/staff'

type StaffRole = 'ADMIN' | 'SUPER_ADMIN' | 'DELIVERY'

interface StaffMember {
  id: string
  username: string
  phone: string
  email: string | null
  role: string
  permissions: string[]
  isActive: boolean
  createdAt: Date
}

const ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN: 'مدير عام',
  ADMIN: 'مدير (صلاحيات محددة)',
  DELIVERY: 'مندوب توصيل',
}

const ROLE_ICON: Record<StaffRole, typeof ShieldCheck> = {
  SUPER_ADMIN: ShieldCheck,
  ADMIN: UserCog,
  DELIVERY: Truck,
}

export function StaffClient({ staff }: { staff: StaffMember[] }) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [pwTarget, setPwTarget] = useState<StaffMember | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(member: StaffMember) {
    setEditing(member)
    setFormOpen(true)
  }

  async function handleToggle(member: StaffMember) {
    setBusyId(member.id)
    const res = await toggleStaffActive(member.id)
    setBusyId(null)
    if (!res.success) alert(res.error)
    else router.refresh()
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`حذف ${member.username}؟ لا يمكن التراجع.`)) return
    setBusyId(member.id)
    const res = await deleteStaff(member.id)
    setBusyId(null)
    if (!res.success) alert(res.error)
    else router.refresh()
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الموظفون والصلاحيات</h1>
          <p className="text-sm text-gray-500 mt-1">
            أضف مدراء ومندوبي توصيل وحدّد ما يستطيع كل منهم الوصول إليه.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 ml-1" />
          إضافة موظف
        </Button>
      </div>

      <div className="grid gap-3">
        {staff.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-gray-500">لا يوجد موظفون بعد.</CardContent>
          </Card>
        )}
        {staff.map((member) => {
          const role = member.role as StaffRole
          const Icon = ROLE_ICON[role] ?? UserCog
          return (
            <Card key={member.id}>
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-blue-900" />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{member.username}</span>
                    {!member.isActive && <Badge variant="error">معطّل</Badge>}
                  </div>
                  <div className="text-sm text-gray-500">{member.phone}</div>
                  {member.email && <div className="text-xs text-gray-400">{member.email}</div>}
                </div>
                <div className="min-w-[160px]">
                  <Badge variant={role === 'SUPER_ADMIN' ? 'success' : 'default'}>
                    {ROLE_LABELS[role] ?? member.role}
                  </Badge>
                  {role === 'ADMIN' && (
                    <div className="text-xs text-gray-400 mt-1">
                      {member.permissions.length} صلاحية
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 min-w-[90px]">{formatDate(member.createdAt)}</div>
                <div className="flex items-center gap-1">
                  <button
                    title="تعديل"
                    onClick={() => openEdit(member)}
                    className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    title="تغيير كلمة المرور"
                    onClick={() => setPwTarget(member)}
                    className="p-2 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    title={member.isActive ? 'تعطيل' : 'تفعيل'}
                    disabled={busyId === member.id}
                    onClick={() => handleToggle(member)}
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50 text-xs font-medium"
                  >
                    {member.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button
                    title="حذف"
                    disabled={busyId === member.id}
                    onClick={() => handleDelete(member)}
                    className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {formOpen && (
        <StaffFormModal
          member={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            router.refresh()
          }}
        />
      )}

      {pwTarget && (
        <PasswordModal
          member={pwTarget}
          onClose={() => setPwTarget(null)}
          onSaved={() => setPwTarget(null)}
        />
      )}
    </div>
  )
}

function StaffFormModal({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!member
  const [username, setUsername] = useState(member?.username ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<StaffRole>((member?.role as StaffRole) ?? 'ADMIN')
  const [permissions, setPermissions] = useState<string[]>(member?.permissions ?? [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function togglePerm(key: string) {
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]))
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    const res = isEdit
      ? await updateStaff(member!.id, { username, role, permissions })
      : await createStaff({ username, phone, email: email || undefined, password, role, permissions })
    setSaving(false)
    if (!res.success) {
      setError(res.error || Object.values(res.errors ?? {})[0]?.[0] || 'حدث خطأ')
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'تعديل موظف' : 'إضافة موظف'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Input label="الاسم" value={username} onChange={(e) => setUsername(e.target.value)} />

          {!isEdit && (
            <>
              <Input
                label="رقم الهاتف (07xxxxxxxx)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
              />
              <Input
                label="البريد الإلكتروني (اختياري)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
            <div className="grid grid-cols-1 gap-2">
              {(['SUPER_ADMIN', 'ADMIN', 'DELIVERY'] as StaffRole[]).map((r) => {
                const Icon = ROLE_ICON[r]
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-right transition-colors ${
                      role === r ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 ${role === r ? 'text-blue-700' : 'text-gray-400'}`} />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{ROLE_LABELS[r]}</span>
                      <span className="block text-xs text-gray-500">
                        {r === 'SUPER_ADMIN'
                          ? 'وصول كامل لكل شيء + إدارة الموظفين'
                          : r === 'ADMIN'
                            ? 'يصل فقط إلى الأقسام التي تحددها بالأسفل'
                            : 'يصل إلى الطلبات فقط'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الأقسام المسموح بها ({permissions.length})
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_CATALOG.filter((p) => p.key !== 'dashboard').map((perm) => (
                  <label
                    key={perm.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                      permissions.includes(perm.key)
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm.key)}
                      onChange={() => togglePerm(perm.key)}
                      className="accent-blue-600"
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">الرئيسية والإحصائيات متاحة دائماً لكل مدير.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            {isEdit ? 'حفظ التغييرات' : 'إضافة'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function PasswordModal({
  member,
  onClose,
  onSaved,
}: {
  member: StaffMember
  onClose: () => void
  onSaved: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    setSaving(true)
    const res = await resetStaffPassword(member.id, password)
    setSaving(false)
    if (!res.success) {
      setError(res.error || 'حدث خطأ')
      return
    }
    alert('تم تغيير كلمة المرور بنجاح')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">كلمة مرور جديدة — {member.username}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-gray-400">8 أحرف على الأقل، وتحتوي على حرف ورقم.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            حفظ
          </Button>
        </div>
      </div>
    </div>
  )
}
