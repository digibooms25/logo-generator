import React from 'react';
import { render, screen } from '@testing-library/react';
import { Home, Settings } from 'lucide-react';
import Breadcrumb, { breadcrumbConfigs } from './Breadcrumb';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Breadcrumb Component', () => {
  const mockBreadcrumbItems = [
    { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Gallery', href: '/gallery' },
    { label: 'Current Page', isActive: true }
  ];

  it('renders breadcrumb items correctly', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('renders links for non-active items', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);
    
    const homeLink = screen.getByRole('link', { name: /home/i });
    const galleryLink = screen.getByRole('link', { name: /gallery/i });
    
    expect(homeLink).toHaveAttribute('href', '/');
    expect(galleryLink).toHaveAttribute('href', '/gallery');
  });

  it('does not render link for active/last item', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);
    
    const currentPageElement = screen.getByText('Current Page');
    expect(currentPageElement.tagName).toBe('SPAN');
    expect(currentPageElement).toHaveAttribute('aria-current', 'page');
  });

  it('displays icons when provided', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);
    
    // Check that the Home icon is rendered (by checking for svg element)
    const homeItem = screen.getByText('Home').closest('a');
    expect(homeItem).toContainHTML('svg');
  });

  it('renders separators between items', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);
    
    // ChevronRight icons should be present as separators
    const separators = document.querySelectorAll('.lucide-chevron-right');
    expect(separators).toHaveLength(2); // 2 separators for 3 items
  });

  it('renders back button when showBackButton is true', () => {
    render(
      <Breadcrumb 
        items={mockBreadcrumbItems} 
        showBackButton 
        backButtonHref="/previous"
        backButtonLabel="Go Back"
      />
    );
    
    const backButton = screen.getByRole('link', { name: /go back/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute('href', '/previous');
  });

  it('applies compact variant styles', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} variant="compact" />);
    
    const breadcrumbNav = screen.getByRole('navigation');
    expect(breadcrumbNav).toBeInTheDocument();
  });

  it('applies detailed variant styles', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} variant="detailed" />);
    
    const breadcrumbNav = screen.getByRole('navigation');
    expect(breadcrumbNav).toBeInTheDocument();
  });

  it('handles custom className', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} className="custom-class" />);
    
    const breadcrumbNav = screen.getByRole('navigation');
    expect(breadcrumbNav).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<Breadcrumb items={mockBreadcrumbItems} />);
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });
});

describe('Breadcrumb Configurations', () => {
  it('generates correct home breadcrumb', () => {
    const homeBreadcrumb = breadcrumbConfigs.home();
    
    expect(homeBreadcrumb).toHaveLength(1);
    expect(homeBreadcrumb[0]).toEqual({
      label: 'Home',
      href: '/',
      icon: expect.any(Object)
    });
  });

  it('generates correct gallery breadcrumb', () => {
    const galleryBreadcrumb = breadcrumbConfigs.gallery();
    
    expect(galleryBreadcrumb).toHaveLength(2);
    expect(galleryBreadcrumb[0].label).toBe('Home');
    expect(galleryBreadcrumb[1].label).toBe('Logo Gallery');
    expect(galleryBreadcrumb[1].isActive).toBe(true);
  });

  it('generates create breadcrumb without inspiration', () => {
    const createBreadcrumb = breadcrumbConfigs.create(false);
    
    expect(createBreadcrumb).toHaveLength(2);
    expect(createBreadcrumb[0].label).toBe('Home');
    expect(createBreadcrumb[1].label).toBe('Create Logo');
  });

  it('generates create breadcrumb with inspiration', () => {
    const createBreadcrumb = breadcrumbConfigs.create(true);
    
    expect(createBreadcrumb).toHaveLength(3);
    expect(createBreadcrumb[0].label).toBe('Home');
    expect(createBreadcrumb[1].label).toBe('Gallery');
    expect(createBreadcrumb[2].label).toBe('Create Logo');
  });

  it('generates correct admin breadcrumb', () => {
    const adminBreadcrumb = breadcrumbConfigs.admin();
    
    expect(adminBreadcrumb).toHaveLength(2);
    expect(adminBreadcrumb[0].label).toBe('Home');
    expect(adminBreadcrumb[1].label).toBe('Admin Panel');
    expect(adminBreadcrumb[1].isActive).toBe(true);
  });

  it('generates correct admin upload breadcrumb', () => {
    const adminUploadBreadcrumb = breadcrumbConfigs.adminUpload();
    
    expect(adminUploadBreadcrumb).toHaveLength(3);
    expect(adminUploadBreadcrumb[0].label).toBe('Home');
    expect(adminUploadBreadcrumb[1].label).toBe('Admin Panel');
    expect(adminUploadBreadcrumb[2].label).toBe('Upload Content');
    expect(adminUploadBreadcrumb[2].isActive).toBe(true);
  });
}); 