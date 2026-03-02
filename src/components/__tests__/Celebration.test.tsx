import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Celebration } from '../Celebration';

describe('Celebration', () => {
  let matchMediaMock: {
    matches: boolean;
    addEventListener: () => void;
    removeEventListener: () => void;
    addListener: () => void;
    removeListener: () => void;
  };

  beforeEach(() => {
    // Mock matchMedia to default to no reduced motion
    // Include deprecated addListener/removeListener for framer-motion compatibility
    matchMediaMock = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  // Edge case tests
  it('renders exactly 30 particles for confetti', () => {
    const { container } = render(<Celebration type="confetti" duration={3000} />);
    const particles = container.querySelectorAll('.absolute.text-2xl');
    expect(particles).toHaveLength(30);
  });

  it('renders exactly 15 particles for hearts', () => {
    const { container } = render(<Celebration type="hearts" duration={2000} />);
    const particles = container.querySelectorAll('.absolute.text-2xl');
    expect(particles).toHaveLength(15);
  });

  it('renders exactly 20 particles for sparkles', () => {
    const { container } = render(<Celebration type="sparkles" duration={1500} />);
    const particles = container.querySelectorAll('.absolute.text-2xl');
    expect(particles).toHaveLength(20);
  });

  it('has aria-hidden attribute for accessibility', () => {
    render(<Celebration type="confetti" duration={3000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveAttribute('aria-hidden', 'true');
  });

  it('respects prefers-reduced-motion (renders nothing)', () => {
    // Mock reduced motion preference
    matchMediaMock.matches = true;
    window.matchMedia = vi.fn().mockReturnValue(matchMediaMock);

    render(<Celebration type="confetti" duration={3000} />);
    const container = screen.queryByTestId('celebration-container');
    expect(container).not.toBeInTheDocument();
  });

  it('particles have will-change CSS for GPU acceleration', () => {
    const { container } = render(<Celebration type="confetti" duration={3000} />);
    const particle = container.querySelector('.absolute.text-2xl');
    expect(particle).toHaveStyle({ willChange: 'transform, opacity' });
  });
});
