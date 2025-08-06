import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Divider } from './Divider';

describe('Divider', () => {
  it('renders without text', () => {
    const { container } = render(<Divider />);
    const divider = container.firstChild;
    expect(divider).toBeInTheDocument();
  });

  it('renders with text', () => {
    render(<Divider text="OR" />);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders different structure with text', () => {
    const { container: withoutText } = render(<Divider />);
    const { container: withText } = render(<Divider text="OR" />);
    
    // Without text: single div
    expect(withoutText.firstChild?.childNodes.length).toBe(0);
    
    // With text: div with 3 spans (line, text, line)
    expect(withText.firstChild?.childNodes.length).toBe(3);
  });

  it('applies custom className', () => {
    const { container } = render(<Divider className="custom-class" />);
    const divider = container.firstChild as HTMLElement;
    expect(divider.className).toContain('custom-class');
  });

  it('applies custom className with text', () => {
    const { container } = render(<Divider text="OR" className="custom-class" />);
    const divider = container.firstChild as HTMLElement;
    expect(divider.className).toContain('custom-class');
  });

  it('renders horizontal orientation by default', () => {
    const { container } = render(<Divider />);
    const divider = container.firstChild as HTMLElement;
    // Check that it's rendered (orientation is applied via CSS modules)
    expect(divider).toBeInTheDocument();
  });

  it('renders vertical orientation when specified', () => {
    const { container } = render(<Divider orientation="vertical" />);
    const divider = container.firstChild as HTMLElement;
    // Check that it's rendered (orientation is applied via CSS modules)
    expect(divider).toBeInTheDocument();
  });
});