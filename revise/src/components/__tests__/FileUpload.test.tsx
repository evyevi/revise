import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  it('renders upload button', () => {
    const onFilesSelected = vi.fn();
    render(<FileUpload onFilesSelected={onFilesSelected} />);
    
    expect(screen.getByText(/upload files/i)).toBeInTheDocument();
  });

  it('renders camera button', () => {
    const onFilesSelected = vi.fn();
    render(<FileUpload onFilesSelected={onFilesSelected} />);
    
    expect(screen.getByText(/take photo/i)).toBeInTheDocument();
  });

  it('accepts file selection', async () => {
    const onFilesSelected = vi.fn();
    const user = userEvent.setup();
    
    const { container } = render(<FileUpload onFilesSelected={onFilesSelected} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    // Get the first file input (upload files input)
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    
    await user.upload(input, file);
    
    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  it('accepts multiple files', async () => {
    const onFilesSelected = vi.fn();
    const user = userEvent.setup();
    
    const { container } = render(<FileUpload onFilesSelected={onFilesSelected} />);
    
    const files = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.txt', { type: 'text/plain' }),
    ];
    
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    await user.upload(input, files);
    
    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it('displays accepted file types', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileUpload 
        onFilesSelected={onFilesSelected}
        acceptedTypes=".pdf,.txt,.jpg"
      />
    );
    
    const input = container.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    expect(input.accept).toBe('.pdf,.txt,.jpg');
  });

  it('has camera input with capture attribute for mobile', () => {
    const onFilesSelected = vi.fn();
    const { container } = render(<FileUpload onFilesSelected={onFilesSelected} />);
    
    // Get the camera input (accepts image/*, has capture attribute)
    const cameraInput = container.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    expect(cameraInput).toBeInTheDocument();
    expect(cameraInput.getAttribute('capture')).toBe('environment');
    expect(cameraInput.accept).toBe('image/*');
  });
});
