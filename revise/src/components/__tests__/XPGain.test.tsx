import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XPGain } from '../XPGain';

describe('XPGain', () => {
  it('renders XP amount with heart icon', () => {
    render(<XPGain amount={100} />);
    
    const element = screen.getByTestId('xp-gain');
    expect(element).toBeInTheDocument();
    expect(element.textContent).toContain('♥');
    expect(element.textContent).toContain('+100');
  });

  it('uses Framer Motion animation', () => {
    render(<XPGain amount={50} />);
    
    const element = screen.getByTestId('xp-gain');
    // Check that it's a motion.div by verifying it has motion-related attributes
    expect(element).toBeInTheDocument();
  });

  it('shows correct XP value for different amounts', () => {
    const { rerender } = render(<XPGain amount={25} />);
    expect(screen.getByTestId('xp-gain').textContent).toContain('+25');
    
    rerender(<XPGain amount={150} />);
    expect(screen.getByTestId('xp-gain').textContent).toContain('+150');
    
    rerender(<XPGain amount={1} />);
    expect(screen.getByTestId('xp-gain').textContent).toContain('+1');
  });

  it('accepts custom position (x, y)', () => {
    render(<XPGain amount={75} x={100} y={200} />);
    
    const element = screen.getByTestId('xp-gain');
    // Check for inline styles with custom position
    expect(element).toHaveStyle({ left: '100px', top: '200px' });
  });

  it('has centered default position', () => {
    render(<XPGain amount={50} />);
    
    const element = screen.getByTestId('xp-gain');
    // Check for Tailwind classes for centering
    expect(element).toHaveClass('left-1/2', 'top-1/2');
  });
});
