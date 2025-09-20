import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from './ui/Dropdown'
import { SearchBar } from '@/features/search/components/SearchBar'
import { useAuth } from '@/features/auth'
import { useTheme } from '@/shared/theme'
import { ChevronDown } from 'lucide-react'

const routeLabel = (pathname: string): string => {
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/partner-org') || pathname.startsWith('/project') || pathname.startsWith('/team') || pathname.startsWith('/base')) return 'Dashboard'
  return 'Map'
}

const ThemeDropdown: React.FC = () => {
  const { theme, setTheme } = useTheme()
  return (
    <Dropdown>
      <DropdownTrigger variant="ghost" size="md" showChevron className="border-0 focus:ring-0 focus:ring-offset-0">
        <span className="inline-flex items-center gap-2">
          <span className="h-5 w-5 inline-block">🌓</span>
          <span className="hidden sm:inline">Theme</span>
        </span>
      </DropdownTrigger>
      <DropdownContent align="end" className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg">
        <DropdownItem onClick={() => setTheme('system')} selected={theme === 'system'}>System</DropdownItem>
        <DropdownItem onClick={() => setTheme('light')} selected={theme === 'light'}>Light</DropdownItem>
        <DropdownItem onClick={() => setTheme('dark')} selected={theme === 'dark'}>Dark</DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}

const AuthMenu: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  if (!user) {
    return (
      <button onClick={() => navigate('/login')} className="px-3 py-1.5 rounded-md text-sm font-medium bg-accent-600 text-white hover:bg-accent-700 transition-colors">Log in</button>
    )
  }
  const first = (user.user_metadata as { first_name?: string })?.first_name ?? ''
  const last = (user.user_metadata as { last_name?: string })?.last_name ?? ''
  return (
    <Dropdown>
      <DropdownTrigger variant="ghost" className="border-0 focus:ring-0 focus:ring-offset-0">
        <div className="h-8 w-8 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-sm font-semibold">
          {first ? first[0] : (user.email?.[0] ?? 'U')}
        </div>
      </DropdownTrigger>
      <DropdownContent align="end" className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg">
        <div className="px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-300">{`${first} ${last}`.trim() || user.email || 'User'}</div>
        <DropdownItem onClick={() => navigate('/profile')}>Profile</DropdownItem>
        <DropdownItem onClick={() => { void signOut(); navigate('/map') }} variant="destructive">Log out</DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}

export const AppHeader: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const intendedSection = searchParams.get('section')
  const label = intendedSection === 'dashboard' ? 'Dashboard' : routeLabel(location.pathname)

  return (
    <header className="sticky top-0 z-30 h-14 px-3 sm:px-4 lg:px-6 bg-white/70 dark:bg-neutral-900/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
      {/* Left: Brand + route switcher */}
      <div className="flex items-baseline gap-1">
        <div className="font-semibold select-none text-base">Every Language</div>
        <Dropdown>
          <DropdownTrigger variant="ghost" className="px-0 py-0 border-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0" showChevron={false}>
            <span className="inline-flex items-center gap-1">
              <span className="text-accent-600 text-base">{label}</span>
              <ChevronDown className="h-4 w-4" />
            </span>
          </DropdownTrigger>
          <DropdownContent className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg">
            <DropdownItem onClick={() => navigate('/map')} selected={label === 'Map'}>
              <span>Map</span>
            </DropdownItem>
            <DropdownItem onClick={() => navigate('/dashboard')} selected={label === 'Dashboard'}>
              <span>Dashboard</span>
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>

      {/* Middle: Search */}
      <div className="flex-1 flex justify-center">
        <SearchBar
          embedded
          onSelect={(item) => {
            if (item.kind === 'language') navigate(`/map/language/${encodeURIComponent(item.id)}`)
            else navigate(`/map/region/${encodeURIComponent(item.id)}`)
          }}
          className="w-full max-w-xl"
        />
      </div>

      {/* Right: Theme + Auth */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeDropdown />
        <AuthMenu />
      </div>
    </header>
  )
}

export default AppHeader


