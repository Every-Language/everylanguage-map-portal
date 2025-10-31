import React from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { createLead } from '../../api/fundingApi'
import { CustomPhoneInput } from '@/features/auth/components/CustomPhoneInput'

export const StepDetails: React.FC<{ flow: any }> = ({ flow }) => {
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async () => {
    // simple validation
    const emailValid = /.+@.+\..+/.test(email)
    if (!firstName || !lastName || !emailValid) {
      setError('Please enter first name, last name, and a valid email.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const intent = flow.state.intent
      const languageIds = intent === 'adopt' ? (flow.state.adopt?.languageIds ?? []) : undefined
      // Non-blocking CRM call
      void createLead({ firstName, lastName, email, phone, intent, languageIds })
      flow.setDonor({ firstName, lastName, email, phone })
      flow.next()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
        <Input placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
        <div className="sm:col-span-2">
          <Input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <CustomPhoneInput value={phone} onChange={(v)=>setPhone(v || '')} />
        </div>
      </div>
      {error && <div className="text-sm text-error-600">{error}</div>}
      <div className="pt-2 flex justify-end">
        <Button onClick={handleSubmit} loading={loading}>Continue</Button>
      </div>
    </div>
  )
}

export default StepDetails



