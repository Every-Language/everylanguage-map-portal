import React from 'react'
import { Button } from '@/shared/components/ui/Button'
import type { DonateIntent } from '../../state/types'

export const StepChooseIntent: React.FC<{ flow: any }> = ({ flow }) => {
  const choose = (intent: DonateIntent) => {
    // setIntent advances to the first step for the chosen path
    flow.setIntent(intent)
  }
  return (
    <div className="space-y-4">
      <div className="text-sm text-neutral-600 dark:text-neutral-400">
        Choose how you want to give
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-2">Support operational costs</div>
          <Button onClick={() => choose('ops')}>Continue</Button>
        </div>
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-2">Adopt a language</div>
          <Button onClick={() => choose('adopt')}>Continue</Button>
        </div>
      </div>
    </div>
  )
}

export default StepChooseIntent



