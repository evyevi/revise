import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function Layout({ children, showBottomNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <main className="flex-1 pb-20">
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
