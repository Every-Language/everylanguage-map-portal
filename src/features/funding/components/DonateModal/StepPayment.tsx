import React from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/shared/components/ui/Button'
import { useAuth } from '@/features/auth'
import { createSponsorshipCheckout } from '../../api/fundingApi'
import type { DonateFlowState, AmountSelection } from '../../state/types'
import { applyFeeCover } from '../../utils/calc'

const pk = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PK) as string | undefined
const stripePromise = pk ? loadStripe(pk) : null

// Prevent duplicate checkout initialization (React StrictMode) and cache clientSecret
const CHECKOUT_CS_CACHE_PREFIX = 'el:checkout:cs:'

type Flow = {
  state: DonateFlowState
  next: () => void
  back: () => void
  setAmount: (amount: AmountSelection) => void
}

const Inner: React.FC<{ flow: Flow; clientSecret: string | null }> = ({ flow, clientSecret }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [completed, setCompleted] = React.useState(false)
  const intent = flow.state.intent

  const handleSubmit = async () => {
    if (!stripe || !elements) return
    if (!clientSecret) return
    setSubmitting(true)
    try {
      // Required for Payment Element (handles Link/PRB state internally)
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setFormError(submitError.message ?? 'Payment form error')
        return
      }
      const confirmed = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: window.location.origin + '/dashboard' },
        redirect: 'if_required',
      })
      if (confirmed.error) throw confirmed.error
      setCompleted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const amountCents = intent === 'ops' ? (flow.state.amount?.amount_cents ?? 0) : (flow.state.adopt?.monthly_cents ?? 0)
  const cover = flow.state.amount?.coverFees ?? true
  const totalCents = cover ? applyFeeCover(amountCents) : amountCents
  const cadenceSuffix = intent === 'adopt' || flow.state.amount?.cadence === 'monthly' ? '/month' : ''
  const currency = flow.state.amount?.currency ?? 'USD'

  if (completed) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-neutral-700 dark:text-neutral-300">Payment received.</div>
        <div className="text-sm">Total paid: <span className="font-medium">${(totalCents/100).toLocaleString()} {currency}{cadenceSuffix}</span></div>
        <div className="flex justify-end">
          <Button onClick={flow.next}>Continue</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-md p-4">
        <PaymentElement options={{ layout: 'accordion' }} />
      </div>
      {formError && (
        <div className="text-sm text-error-600">{formError}</div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={cover}
          onChange={(e)=> {
            const current: AmountSelection = flow.state.amount ?? { cadence: 'monthly', amount_cents: 0, currency: 'USD', coverFees: true }
            flow.setAmount({ ...current, coverFees: e.target.checked })
          }}
        />
        Cover transaction costs
      </label>
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-700 dark:text-neutral-300">Total <span className="font-medium">${(totalCents/100).toLocaleString()} {currency}{cadenceSuffix}</span></div>
        <Button onClick={handleSubmit} loading={submitting} className="h-12 px-6">Donate</Button>
      </div>
    </div>
  )
}

export const StepPayment: React.FC<{ flow: Flow }> = ({ flow }) => {
  const intent = flow.state.intent
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [initializing, setInitializing] = React.useState<boolean>(true)
  const [initError, setInitError] = React.useState<string | null>(null)
  const currency = (flow.state.amount?.currency ?? 'USD').toLowerCase()
  // Removed strict-mode guard that could leave initializing=true when hot reloading
  const { user } = useAuth()

  const minCentsForCurrency = (ccy: string) => {
    switch (ccy) {
      case 'usd':
      case 'aud':
      case 'nzd':
      case 'sgd':
      case 'eur':
      case 'gbp':
        return 50
      case 'jpy':
        return 50 // JPY has 0-decimal, but Stripe applies currency rules server-side
      default:
        return 50
    }
  }

  React.useEffect(() => {
    let isMounted = true
    const donorEmail = flow.state.donor?.email ?? (user?.email ?? '')
    const idsKey = (flow.state.adopt?.languageIds ?? []).join(',')
    const baseCents = flow.state.amount?.amount_cents ?? 0
    const coverFees = flow.state.amount?.coverFees ?? true
    const totalCents = coverFees ? applyFeeCover(baseCents) : baseCents
    const cacheKey = `${CHECKOUT_CS_CACHE_PREFIX}${intent}:${donorEmail}:${idsKey}:${totalCents}:${currency}`

    // If cached client secret exists (from prior StrictMode mount), reuse it
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      setClientSecret(cached !== 'null' ? cached : null)
      setInitializing(false)
      return () => { isMounted = false }
    }

    ;(async () => {
      setInitializing(true)
      try {
        type OpsPayload = { purpose: 'operations'; donor: { firstName: string; lastName: string; email: string; phone?: string }; mode: 'card'; donateOnlyCents: number }
        type AdoptPayload = { purpose: 'adoption'; donor: { firstName: string; lastName: string; email: string; phone?: string }; mode: 'card'; adoptionIds: string[] }
        let payload: OpsPayload | AdoptPayload
        if (intent === 'ops') {
          const baseCents = flow.state.amount?.amount_cents ?? 0
          const coverFees = flow.state.amount?.coverFees ?? true
          const totalCents = coverFees ? applyFeeCover(baseCents) : baseCents
          const min = minCentsForCurrency(currency)
          if (!totalCents || totalCents < min) {
            throw new Error(`Minimum charge is ${(min/100).toFixed(2)} ${currency.toUpperCase()}.`)
          }
          const meta = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string }
          const donorFirst = flow.state.donor?.firstName ?? meta.first_name ?? (user?.email?.split('@')[0] ?? 'Donor')
          const donorLast = flow.state.donor?.lastName ?? meta.last_name ?? 'Supporter'
          const donorEmail = flow.state.donor?.email ?? (user?.email ?? '')
          payload = {
            purpose: 'operations' as const,
            donor: { firstName: donorFirst, lastName: donorLast, email: donorEmail },
            mode: 'card' as const,
            donateOnlyCents: totalCents,
          }
        } else {
          const ids = flow.state.adopt?.languageIds ?? []
          if (!ids.length) {
            throw new Error('Select at least one language to continue.')
          }
          const meta = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string }
          const donorFirst = flow.state.donor?.firstName ?? meta.first_name ?? (user?.email?.split('@')[0] ?? 'Donor')
          const donorLast = flow.state.donor?.lastName ?? meta.last_name ?? 'Supporter'
          const donorEmail = flow.state.donor?.email ?? (user?.email ?? '')
          payload = {
            purpose: 'adoption' as const,
            donor: { firstName: donorFirst, lastName: donorLast, email: donorEmail },
            mode: 'card' as const,
            adoptionIds: ids,
          }
        }
        const res = await createSponsorshipCheckout(payload)
        const cs: string | null = res.depositClientSecret ?? res.clientSecret ?? null
        if (isMounted) {
          setClientSecret(cs)
          try { sessionStorage.setItem(cacheKey, cs ?? 'null') } catch { /* ignore */ }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (isMounted) setInitError(msg || 'Failed to initialize payment')
      } finally {
        if (isMounted) setInitializing(false)
      }
    })()
    return () => { isMounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!stripePromise) return <div className="text-sm text-error-600">Missing VITE_STRIPE_PUBLISHABLE_KEY. Set it in your env and restart dev server.</div>
  if (initializing) return <div className="text-sm">Loading payment…</div>
  if (initError || !clientSecret) return (
    <div className="space-y-3">
      <div className="text-sm text-error-600">{initError || 'Unable to load payment form.'}</div>
      <div className="flex justify-end">
        <Button variant="secondary" onClick={flow.back}>Back</Button>
      </div>
    </div>
  )

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#16a34a',
      colorBackground: '#0a0a0a',
      colorText: '#f4f4f5',
      colorTextSecondary: '#a1a1aa',
      colorDanger: '#ef4444',
      borderRadius: '12px',
    },
    rules: {
      '.Input': { backgroundColor: '#111111', borderColor: '#27272a' },
      '.Label': { color: '#a1a1aa' },
    },
  } as const

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <Inner flow={flow} clientSecret={clientSecret} />
    </Elements>
  )
}

export default StepPayment



