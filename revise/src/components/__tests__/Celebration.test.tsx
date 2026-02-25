import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Celebration } from '../Celebration';

describe('Celebration', () => {
  it('renders confetti with correct class', () => {
    render(<Celebration type="confetti" duration={3000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveClass('celebration-confetti');
  });

  it('renders hearts with correct class', () => {
    render(<Celebration type="hearts" duration={2000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveClass('celebration-hearts');
  });

  it('renders sparkles with correct class', () => {
    render(<Celebration type="sparkles" duration={1500} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveClass('celebration-sparkles');
  });

  it('applies duration prop correctly', () => {
    render(<Celebration type="confetti" duration={5000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveStyle({ '--celebration-duration': '5000ms' });
  });

  it('accepts and applies custom className', () => {
    render(<Celebration type="confetti" duration={3000} className="custom-class" />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveClass('custom-class');
  });
});
