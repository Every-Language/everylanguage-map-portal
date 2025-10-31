import React from 'react'
import { LanguagesTable } from '../components/LanguagesTable'

export const PublicLanguagesPage: React.FC = () => {
  return (
    <div className="px-4 py-4">
      <h1 className="text-2xl font-semibold mb-4">Adopt a language</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-4">Select languages to sponsor or learn more.</p>
      <LanguagesTable />
    </div>
  )
}

export default PublicLanguagesPage



