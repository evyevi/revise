import { Link, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/') ? 'text-primary-500' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">🏠</span>
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link
          to="/progress"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/progress') ? 'text-primary-500' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">📊</span>
          <span className="text-xs mt-1">Progress</span>
        </Link>
        
        <Link
          to="/profile"
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive('/profile') ? 'text-primary-500' : 'text-gray-600'
          }`}
        >
          <span className="text-2xl">⭐</span>
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
