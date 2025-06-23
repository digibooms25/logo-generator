import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Settings, User, Menu } from 'lucide-react';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

export interface NavigationAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBackButton?: boolean;
  backButtonHref?: string;
  backButtonLabel?: string;
  actions?: NavigationAction[];
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

export default function NavigationHeader({
  title,
  subtitle,
  breadcrumbs,
  showBackButton = false,
  backButtonHref = '/',
  backButtonLabel = 'Back',
  actions = [],
  className = '',
  variant = 'default'
}: NavigationHeaderProps) {
  const isCompact = variant === 'compact';
  const isMinimal = variant === 'minimal';

  const getActionClasses = (action: NavigationAction) => {
    const baseClasses = "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors";
    
    switch (action.variant) {
      case 'primary':
        return `${baseClasses} bg-indigo-600 text-white hover:bg-indigo-700`;
      case 'secondary':
        return `${baseClasses} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`;
      case 'ghost':
        return `${baseClasses} text-gray-600 hover:text-indigo-600 hover:bg-gray-100`;
      default:
        return `${baseClasses} text-gray-600 hover:text-indigo-600`;
    }
  };

  if (isMinimal) {
    return (
      <header className={`bg-white border-b border-gray-200 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <Link
                  href={backButtonHref}
                  className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {backButtonLabel}
                </Link>
              )}
              <h1 className="text-lg font-medium text-gray-900">{title}</h1>
            </div>
            {actions.length > 0 && (
              <div className="flex items-center space-x-2">
                {actions.map((action, index) => (
                  action.href ? (
                    <Link key={index} href={action.href} className={getActionClasses(action)}>
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </Link>
                  ) : (
                    <button key={index} onClick={action.onClick} className={getActionClasses(action)}>
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main header content */}
        <div className={`flex justify-between items-center ${isCompact ? 'h-12' : 'h-16'}`}>
          {/* Left side - Logo and title */}
          <div className="flex items-center space-x-4">
            {/* Logo/Brand (on main pages) */}
            {!showBackButton && !breadcrumbs && (
              <Link href="/" className="flex items-center">
                <Sparkles className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">AI Logo Generator</span>
              </Link>
            )}

            {/* Back button or breadcrumbs */}
            {showBackButton && !breadcrumbs && (
              <>
                <Link
                  href={backButtonHref}
                  className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {backButtonLabel}
                </Link>
                <div className="h-6 border-l border-gray-300" />
              </>
            )}

            {/* Title */}
            <div>
              <h1 className={`font-semibold text-gray-900 ${isCompact ? 'text-lg' : 'text-xl'}`}>
                {title}
              </h1>
              {subtitle && !isCompact && (
                <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          {actions.length > 0 && (
            <div className="flex items-center space-x-3">
              {actions.map((action, index) => (
                action.href ? (
                  <Link key={index} href={action.href} className={getActionClasses(action)}>
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </Link>
                ) : (
                  <button key={index} onClick={action.onClick} className={getActionClasses(action)}>
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </button>
                )
              ))}
            </div>
          )}
        </div>

        {/* Breadcrumbs row (if provided) */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className={`border-t border-gray-100 ${isCompact ? 'py-2' : 'py-3'}`}>
            <Breadcrumb 
              items={breadcrumbs} 
              showBackButton={showBackButton}
              backButtonHref={backButtonHref}
              backButtonLabel={backButtonLabel}
              variant={isCompact ? 'compact' : 'default'}
            />
          </div>
        )}

        {/* Subtitle row (if provided and using breadcrumbs) */}
        {subtitle && breadcrumbs && !isCompact && (
          <div className="pb-3">
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
        )}
      </div>
    </header>
  );
}

// Predefined navigation configurations for different pages
export const navigationConfigs = {
  home: (): NavigationHeaderProps => ({
    title: 'AI Logo Generator',
    actions: [
      { label: 'Gallery', href: '/gallery', variant: 'ghost' },
      { label: 'Create Logo', href: '/create', variant: 'primary' },
      { label: 'Admin', href: '/admin', variant: 'ghost' }
    ]
  }),

  gallery: (): NavigationHeaderProps => ({
    title: 'Logo Gallery',
    subtitle: 'Browse and discover professional logos for inspiration',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Gallery', isActive: true }
    ],
    actions: [
      { label: 'Create Logo', href: '/create', variant: 'primary' },
      { label: 'Admin', href: '/admin', variant: 'ghost' }
    ]
  }),

  create: (hasInspiration = false): NavigationHeaderProps => ({
    title: 'Create Logo',
    subtitle: hasInspiration 
      ? 'Tell us about your business to generate logos based on your inspiration'
      : 'Tell us about your business and we\'ll generate professional logos for you',
    breadcrumbs: hasInspiration ? [
      { label: 'Home', href: '/' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Create', isActive: true }
    ] : [
      { label: 'Home', href: '/' },
      { label: 'Create', isActive: true }
    ],
    actions: [
      { label: 'Browse Gallery', href: '/gallery', variant: 'ghost' }
    ]
  }),

  admin: (): NavigationHeaderProps => ({
    title: 'Admin Panel',
    subtitle: 'Manage logos, icons, and application content',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Admin', isActive: true }
    ],
    actions: [
      { label: 'View Gallery', href: '/gallery', variant: 'ghost' },
      { label: 'Logout', onClick: () => {
        sessionStorage.removeItem('admin-authenticated');
        window.location.reload();
      }, variant: 'ghost', icon: <User className="h-4 w-4" /> }
    ]
  })
}; 