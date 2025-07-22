
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/design-system/utils';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const location = useLocation();

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊'
    },
    {
      path: '/projects/new',
      label: 'New Project',
      icon: '➕'
    },
    {
      path: '/upload',
      label: 'Upload Audio',
      icon: '🎵'
    },
    {
      path: '/components',
      label: 'UI Components',
      icon: '🎨'
    }
  ];

  return (
    <nav className={cn('flex items-center space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default Navigation; 