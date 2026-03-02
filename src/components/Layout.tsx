import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function Layout({ children, showBottomNav = true }: LayoutProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-cream">
        <main className="flex-1 pb-20">
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </MotionConfig>
  );
}
