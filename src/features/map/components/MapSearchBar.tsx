import React from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '@/features/search/components/SearchBar'
import type { SearchResult } from '@/features/search/types'

export const MapSearchBar: React.FC = () => {
  const navigate = useNavigate()

  const onSelect = (item: SearchResult) => {
    if (item.kind === 'language') navigate(`/map/language/${encodeURIComponent(item.id)}`)
    else navigate(`/map/region/${encodeURIComponent(item.id)}`)
  }

  return (
    <SearchBar onSelect={onSelect} />
  )
}

export default MapSearchBar


