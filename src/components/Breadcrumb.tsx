import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  backButtonHref?: string;
  backButtonLabel?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function Breadcrumb({ 
  items, 
  showBackButton = false,
  backButtonHref = '/',
  backButtonLabel = 'Back',
  className = '',
  variant = 'default'
}: BreadcrumbProps) {
  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {/* Back Button */}
      {showBackButton && (
        <>
          <Link
            href={backButtonHref}
            className={`flex items-center text-gray-600 hover:text-indigo-600 transition-colors font-medium ${
              isCompact ? 'text-xs' : 'text-sm'
            }`}
          >
            <ArrowLeft className={`mr-1 ${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`} />
            {backButtonLabel}
          </Link>
          <div className={`border-l border-gray-300 ${isCompact ? 'h-3' : 'h-4'}`} />
        </>
      )}

      {/* Breadcrumb Items */}
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {/* Separator */}
              {!isFirst && (
                <ChevronRight 
                  className={`text-gray-400 mx-2 ${isCompact ? 'h-3 w-3' : 'h-4 w-4'}`}
                  aria-hidden="true"
                />
              )}

              {/* Breadcrumb Item */}
              <div className="flex items-center">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className={`flex items-center text-gray-600 hover:text-indigo-600 transition-colors font-medium ${
                      isCompact ? 'text-xs' : 'text-sm'
                    } ${isDetailed ? 'px-2 py-1 rounded-md hover:bg-gray-100' : ''}`}
                  >
                    {item.icon && (
                      <span className={`mr-1.5 ${isCompact ? 'text-xs' : ''}`}>
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </Link>
                ) : (
                  <span 
                    className={`flex items-center font-medium ${
                      item.isActive || isLast 
                        ? 'text-indigo-600' 
                        : 'text-gray-500'
                    } ${isCompact ? 'text-xs' : 'text-sm'} ${
                      isDetailed ? 'px-2 py-1 rounded-md bg-indigo-50' : ''
                    }`}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.icon && (
                      <span className={`mr-1.5 ${isCompact ? 'text-xs' : ''}`}>
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Predefined breadcrumb configurations for common routes
export const breadcrumbConfigs = {
  home: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> }
  ],
  
  gallery: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Logo Gallery', isActive: true }
  ],
  
  create: (hasInspiration = false): BreadcrumbItem[] => [
    { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> },
    ...(hasInspiration ? [{ label: 'Gallery', href: '/gallery' }] : []),
    { label: 'Create Logo', isActive: true }
  ],
  
  admin: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Admin Panel', isActive: true }
  ],
  
  adminUpload: (): BreadcrumbItem[] => [
    { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> },
    { label: 'Admin Panel', href: '/admin' },
    { label: 'Upload Content', isActive: true }
  ]
}; 