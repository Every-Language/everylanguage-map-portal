import React from 'react'
import { DialogContent, DialogTitle, DialogDescription } from '@/shared/components/ui/Dialog'
import { Button } from '@/shared/components/ui/Button'
import { useDonateFlow } from '../../hooks/useDonateFlow'
import { StepChooseIntent } from './StepChooseIntent'
import { StepAmount } from './StepAmount'
import { StepDetails } from './StepDetails'
import { StepLanguages } from './StepLanguages'
import { StepAccount } from './StepAccount'
import { useAuth } from '@/features/auth'

const StepPayment = React.lazy(() => import('./StepPayment'))

export const DonateModal: React.FC = () => {
  const flow = useDonateFlow()
  const { state } = flow
  const { user } = useAuth()

  // Skip details/account when already logged in
  React.useEffect(() => {
    if (!user) return
    if (state.intent === 'ops' && state.step === 1) {
      flow.next()
    }
    if (state.intent === 'adopt' && state.step === 2) {
      flow.next()
    }
  // flow object is stable for this component; intent/step changes drive transitions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.intent, state.step])

  return (
    <>
      <DialogContent size="4xl" className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left info */}
          <div className="hidden md:block bg-neutral-50 dark:bg-neutral-900/40 p-6 md:p-8 border-r border-neutral-200 dark:border-neutral-800">
            <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Partner with Every Language</div>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">End Inaction</h2>
            <p className="text-neutral-700 dark:text-neutral-300 text-sm leading-6">
              Be a part of the movement. Give today to help accelerate Bible translation
              in every language. Your gift fuels field work and multiplies impact around the globe.
            </p>
            <div className="mt-6 text-[11px] text-neutral-500">Is my donation secure? Is this tax-deductible? Can I cancel my recurring donation?</div>
          </div>

          {/* Right step content */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base">Secure donation</DialogTitle>
                {state.step > 0 && (
                  <Button variant="ghost" size="sm" onClick={flow.back}>
                    Back
                  </Button>
                )}
              </div>
              <DialogDescription className="sr-only">Complete your donation using a secure form.</DialogDescription>
              {state.step === 0 && <StepChooseIntent flow={flow} />}
              {state.step === 1 && state.intent === 'ops' && <StepDetails flow={flow} />}
              {state.step === 2 && state.intent === 'ops' && <StepAmount flow={flow} />}
              {state.step === 3 && state.intent === 'ops' && (
                <React.Suspense fallback={<div className="text-sm">Loading payment…</div>}>
                  <StepPayment flow={flow} />
                </React.Suspense>
              )}
              {state.intent === 'ops' && state.step === 4 && <StepAccount flow={flow} />}

              {state.intent === 'adopt' && state.step === 1 && <StepLanguages flow={flow} />}
              {state.intent === 'adopt' && state.step === 2 && <StepDetails flow={flow} />}
              {state.intent === 'adopt' && state.step === 3 && (
                <React.Suspense fallback={<div className="text-sm">Loading payment…</div>}>
                  <StepPayment flow={flow} />
                </React.Suspense>
              )}
              {state.intent === 'adopt' && state.step === 4 && <StepAccount flow={flow} />}
            </div>
          </div>
        </div>
      </DialogContent>
    </>
  )
}

export default DonateModal



