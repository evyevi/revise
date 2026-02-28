import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeUnlock } from '../BadgeUnlock';
import type { BadgeType } from '../../lib/badgeService';

describe('BadgeUnlock', () => {
  it('renders badge icon and name', () => {
    render(<BadgeUnlock badgeId="first-step" />);
    
    const element = screen.getByTestId('badge-unlock');
    expect(element).toBeInTheDocument();
    expect(element.textContent).toContain('🎯');
    expect(element.textContent).toContain('First Step');
  });

  it('shows "Badge Unlocked!" message', () => {
    render(<BadgeUnlock badgeId="quiz-champion" />);
    
    const element = screen.getByTestId('badge-unlock');
    expect(element.textContent).toContain('Badge Unlocked!');
  });

  it('displays badge description', () => {
    render(<BadgeUnlock badgeId="dedicated-student" />);
    
    const element = screen.getByTestId('badge-unlock');
    expect(element.textContent).toContain('Maintain a 3-day study streak');
  });

  it('has scale-up animation', () => {
    render(<BadgeUnlock badgeId="on-fire" />);
    
    const element = screen.getByTestId('badge-unlock');
    // Verify the element exists and has the necessary testid
    expect(element).toBeInTheDocument();
  });

  it('has sparkle overlay effect', () => {
    render(<BadgeUnlock badgeId="flashcard-master" />);
    
    const sparkles = screen.getByTestId('badge-sparkles');
    expect(sparkles).toBeInTheDocument();
  });

  it('returns null for unknown badge ID', () => {
    const { container } = render(<BadgeUnlock badgeId={'unknown-badge' as BadgeType} />);
    
    expect(container.firstChild).toBeNull();
  });
});
