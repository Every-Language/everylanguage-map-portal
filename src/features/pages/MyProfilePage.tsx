import React from 'react'
import { useAuth, authService } from '@/features/auth'
import { Navigate } from 'react-router-dom'
import { Form, FormActions, FormDescription, FormField, FormLabel } from '@/shared/components/ui/Form'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { CustomPhoneInput } from '@/features/auth/components/CustomPhoneInput'
import { useToast } from '@/shared/theme/hooks/useToast'
import type { DbUser } from '@/features/auth'

export const MyProfilePage: React.FC = () => {
  const { user, loading, updateProfile } = useAuth()
  const { toast } = useToast()

  const [dbUser, setDbUser] = React.useState<DbUser | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = React.useState<boolean>(true)
  const [isEditing, setIsEditing] = React.useState<boolean>(false)

  const [firstName, setFirstName] = React.useState<string>('')
  const [lastName, setLastName] = React.useState<string>('')
  const [phone, setPhone] = React.useState<string | undefined>(undefined)

  const loadProfile = React.useCallback(async () => {
    if (!user) return
    setIsLoadingProfile(true)
    try {
      const data = await authService.getDbUser(user.id)
      setDbUser(data)
      if (data) {
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setPhone(data.phone_number ?? undefined)
      } else {
        const meta = (user.user_metadata as { first_name?: string; last_name?: string; phone_number?: string }) || {}
        setFirstName(meta.first_name || '')
        setLastName(meta.last_name || '')
        setPhone(meta.phone_number)
      }
    } finally {
      setIsLoadingProfile(false)
    }
  }, [user])

  React.useEffect(() => {
    if (user) void loadProfile()
  }, [user, loadProfile])

  if (loading || isLoadingProfile) return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  if (!user) return <Navigate to="/login?next=/profile" replace />

  const fullName = `${dbUser?.first_name ?? ''} ${dbUser?.last_name ?? ''}`.trim() || (user.email ?? 'User')

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-neutral-500">Account</div>
              <h1 className="text-2xl font-bold">My Profile</h1>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>Edit profile</Button>
            )}
          </div>

          {!isEditing ? (
            <div className="space-y-6">
              <div>
                <div className="text-sm text-neutral-500">Name</div>
                <div className="text-base font-medium">{fullName}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-500">Email</div>
                <div className="text-base font-medium">{user.email ?? '—'}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-500">Phone</div>
                <div className="text-base font-medium">{dbUser?.phone_number ?? '—'}</div>
              </div>
            </div>
          ) : (
            <Form
              onSubmit={async () => {
                try {
                  await updateProfile({ firstName, lastName, phone })
                  await loadProfile()
                  setIsEditing(false)
                  toast({ title: 'Profile updated', description: 'Your changes have been saved.', variant: 'success' })
                } catch (err) {
                  console.error(err)
                  toast({ title: 'Update failed', description: 'Please try again.', variant: 'destructive' })
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="firstName">
                  <FormLabel>First name</FormLabel>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                </FormField>
                <FormField name="lastName">
                  <FormLabel>Last name</FormLabel>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                </FormField>
              </div>

              <FormField name="email">
                <FormLabel>Email</FormLabel>
                <Input value={user.email ?? ''} disabled />
                <FormDescription>Managed by authentication, not editable.</FormDescription>
              </FormField>

              <FormField name="phone">
                <FormLabel>Phone</FormLabel>
                <CustomPhoneInput value={phone} onChange={(val) => setPhone(val)} />
              </FormField>

              <FormActions>
                <Button type="button" variant="secondary" onClick={() => {
                  setFirstName(dbUser?.first_name ?? '')
                  setLastName(dbUser?.last_name ?? '')
                  setPhone(dbUser?.phone_number ?? undefined)
                  setIsEditing(false)
                }}>Cancel</Button>
                <Button type="submit">Save changes</Button>
              </FormActions>
            </Form>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyProfilePage


