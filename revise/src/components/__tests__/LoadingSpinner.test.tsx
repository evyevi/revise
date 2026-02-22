import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders spinner with message', () => {
    render(
      <LoadingSpinner message="Loading your plan..." />
    );
    expect(screen.getByText('Loading your plan...')).toBeInTheDocument();
  });

  it('renders spinner without message', () => {
    render(
      <LoadingSpinner />
    );
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('supports size variant sm', () => {
    render(
      <LoadingSpinner
        message="Loading"
        size="sm"
      />
    );
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveStyle({ width: '20px', height: '20px' });
  });

  it('supports size variant md', () => {
    render(
      <LoadingSpinner
        message="Loading"
        size="md"
      />
    );
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('supports size variant lg', () => {
    render(
      <LoadingSpinner
        message="Loading"
        size="lg"
      />
    );
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveStyle({ width: '60px', height: '60px' });
  });

  it('defaults to md size when not provided', () => {
    render(
      <LoadingSpinner message="Loading" />
    );
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('renders inline spinner by default', () => {
    const { container } = render(
      <LoadingSpinner message="Loading" />
    );
    
    const backdrop = container.querySelector('.bg-black.bg-opacity-50');
    expect(backdrop).not.toBeInTheDocument();
  });

  it('renders full screen spinner with backdrop when fullScreen is true', () => {
    const { container } = render(
      <LoadingSpinner
        message="Loading"
        fullScreen={true}
      />
    );
    
    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).toBeInTheDocument();
  });

  it('centers content in full screen mode', () => {
    const { container } = render(
      <LoadingSpinner
        message="Loading"
        fullScreen={true}
      />
    );
    
    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('applies semi-transparent black backdrop in full screen', () => {
    const { container } = render(
      <LoadingSpinner
        message="Loading"
        fullScreen={true}
      />
    );
    
    const backdrop = container.querySelector('.bg-opacity-50');
    expect(backdrop).toBeInTheDocument();
  });

  it('has z-50 layer in full screen mode', () => {
    const { container } = render(
      <LoadingSpinner
        message="Loading"
        fullScreen={true}
      />
    );
    
    const backdrop = container.querySelector('.z-50');
    expect(backdrop).toBeInTheDocument();
  });

  it('renders spinner SVG', () => {
    const { container } = render(
      <LoadingSpinner message="Loading" />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies animate-spin to SVG', () => {
    const { container } = render(
      <LoadingSpinner message="Loading" />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('sets aria-label when message is provided', () => {
    render(
      <LoadingSpinner
        message="Processing your request"
        fullScreen={false}
      />
    );
    
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Processing your request');
  });

  it('sets default aria-label when no message', () => {
    render(
      <LoadingSpinner fullScreen={false} />
    );
    
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders white box background in full screen', () => {
    const { container } = render(
      <LoadingSpinner
        message="Loading"
        fullScreen={true}
      />
    );
    
    const box = container.querySelector('.bg-white.rounded-xl');
    expect(box).toBeInTheDocument();
  });

  it('contains spinner and message in flex column', () => {
    const { container } = render(
      <LoadingSpinner
        message="Loading plan..."
        size="md"
      />
    );
    
    const flexContainer = container.querySelector('.flex.flex-col');
    expect(flexContainer).toBeInTheDocument();
    expect(flexContainer).toHaveClass('items-center', 'justify-center', 'gap-4');
  });

  it('message text has proper styling', () => {
    render(
      <LoadingSpinner
        message="Loading your study plan"
      />
    );
    
    const text = screen.getByText('Loading your study plan');
    expect(text).toHaveClass('text-center', 'font-medium', 'text-gray-700');
  });

  it('renders all sizes without message', () => {
    const { rerender } = render(
      <LoadingSpinner size="sm" />
    );
    expect(screen.getByRole('status')).toHaveStyle({ width: '20px' });

    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByRole('status')).toHaveStyle({ width: '40px' });

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole('status')).toHaveStyle({ width: '60px' });
  });
});
