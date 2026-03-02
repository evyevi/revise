import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/progress', label: 'Progress', icon: '📊' },
] as const;

type NavPath = typeof NAV_ITEMS[number]['path'];

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (path: NavPath): boolean => location.pathname === path;

  const getLinkClasses = (active: boolean): string => {
    const baseClasses = 'flex flex-col items-center justify-center w-full h-full transition-colors duration-200';
    const colorClasses = active ? 'text-primary-500' : 'text-gray-600 hover:text-gray-800';
    const focusClasses = 'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500';
    return `${baseClasses} ${colorClasses} ${focusClasses}`;
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={getLinkClasses(isActive(item.path))}
            aria-current={isActive(item.path) ? 'page' : undefined}
            aria-label={`Navigate to ${item.label}`}
          >
            <span className="text-2xl" aria-hidden="true">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
