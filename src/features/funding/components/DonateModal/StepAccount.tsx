import React from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { authService } from '@/features/auth/services/auth'
import { useToast } from '@/shared/theme/hooks/useToast'

export const StepAccount: React.FC<{ flow: any }> = ({ flow }) => {
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const email = flow.state.donor?.email as string
  const { toast } = useToast()

  const validate = (pwd: string) => {
    if (!pwd || pwd.length < 10) return 'Password must be at least 10 characters.'
    if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) return 'Use letters and numbers for stronger security.'
    return null
  }

  const create = async () => {
    const v = validate(password)
    if (v) { setError(v); return }
    setError(null)
    setLoading(true)
    try {
      await authService.signUp(email, password, { first_name: flow.state.donor?.firstName, last_name: flow.state.donor?.lastName })
      toast({ title: 'Account created', description: 'Redirecting to your dashboard…', variant: 'success' })
      window.location.href = '/dashboard'
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (/already registered/i.test(msg)) {
        toast({ title: 'Already registered', description: 'Taking you to your dashboard…', variant: 'info' })
        window.location.href = '/dashboard'
        return
      }
      if (/weak/i.test(msg)) {
        setError('Password is weak. Choose a longer password with letters and numbers.')
        return
      }
      setError('Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-neutral-600 dark:text-neutral-400">Create your account to manage sponsorships</div>
      <Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      {error && <div className="text-sm text-error-600">{error}</div>}
      <Button onClick={create} loading={loading}>Create account</Button>
    </div>
  )
}

export default StepAccount



