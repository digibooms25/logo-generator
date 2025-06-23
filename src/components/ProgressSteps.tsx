import React from 'react';
import { Check, Clock, AlertCircle, ArrowRight } from 'lucide-react';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
  icon?: React.ReactNode;
  optional?: boolean;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  currentStepId?: string;
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'compact';
  showDescriptions?: boolean;
  clickable?: boolean;
  onStepClick?: (stepId: string) => void;
}

export default function ProgressSteps({
  steps,
  currentStepId,
  className = '',
  variant = 'horizontal',
  showDescriptions = true,
  clickable = false,
  onStepClick
}: ProgressStepsProps) {
  const isVertical = variant === 'vertical';
  const isCompact = variant === 'compact';

  const getStatusIcon = (step: ProgressStep) => {
    if (step.icon && step.status === 'pending') return step.icon;
    
    switch (step.status) {
      case 'completed':
        return <Check className="h-5 w-5" />;
      case 'current':
        return <Clock className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return step.icon || <div className="w-5 h-5" />;
    }
  };

  const getStatusClasses = (step: ProgressStep) => {
    const baseClasses = "flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-200";
    
    switch (step.status) {
      case 'completed':
        return `${baseClasses} bg-green-600 text-white`;
      case 'current':
        return `${baseClasses} bg-indigo-600 text-white ring-4 ring-indigo-100`;
      case 'error':
        return `${baseClasses} bg-red-600 text-white`;
      default:
        return `${baseClasses} bg-gray-300 text-gray-600`;
    }
  };

  const getConnectorClasses = (currentIndex: number) => {
    const nextStep = steps[currentIndex + 1];
    const currentStep = steps[currentIndex];
    
    if (isVertical) {
      return `w-0.5 h-8 ${
        currentStep.status === 'completed' || nextStep?.status === 'current' || nextStep?.status === 'completed'
          ? 'bg-indigo-600'
          : 'bg-gray-300'
      }`;
    }
    
    return `flex-1 h-0.5 ${
      currentStep.status === 'completed'
        ? 'bg-indigo-600'
        : 'bg-gray-300'
    }`;
  };

  const handleStepClick = (step: ProgressStep) => {
    if (clickable && onStepClick && (step.status === 'completed' || step.status === 'current')) {
      onStepClick(step.id);
    }
  };

  if (isCompact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center space-x-2">
              <div className={getStatusClasses(step)}>
                {getStatusIcon(step)}
              </div>
              <span className={`text-sm font-medium ${
                step.status === 'current' || step.status === 'completed'
                  ? 'text-indigo-600'
                  : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-gray-400" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (isVertical) {
    return (
      <div className={`space-y-6 ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            <div className="flex items-start">
              <div 
                className={`relative ${
                  clickable && (step.status === 'completed' || step.status === 'current')
                    ? 'cursor-pointer hover:scale-105'
                    : ''
                }`}
                onClick={() => handleStepClick(step)}
              >
                <div className={getStatusClasses(step)}>
                  {getStatusIcon(step)}
                </div>
                {step.optional && (
                  <span className="absolute -top-1 -right-1 bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded-full">
                    Optional
                  </span>
                )}
              </div>
              
              <div className="ml-4 flex-1">
                <h3 className={`text-sm font-medium ${
                  step.status === 'current' || step.status === 'completed'
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}>
                  {step.label}
                </h3>
                {showDescriptions && step.description && (
                  <p className={`mt-1 text-sm ${
                    step.status === 'current' || step.status === 'completed'
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                )}
                {step.status === 'error' && (
                  <p className="mt-1 text-sm text-red-600">
                    Please review and fix any issues before continuing.
                  </p>
                )}
              </div>
            </div>
            
            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="absolute left-5 top-10">
                <div className={getConnectorClasses(index)} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <div 
                className={`relative ${
                  clickable && (step.status === 'completed' || step.status === 'current')
                    ? 'cursor-pointer hover:scale-105'
                    : ''
                }`}
                onClick={() => handleStepClick(step)}
              >
                <div className={getStatusClasses(step)}>
                  {getStatusIcon(step)}
                </div>
                {step.optional && (
                  <span className="absolute -top-1 -right-1 bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded-full">
                    Optional
                  </span>
                )}
              </div>
              
              <div className="mt-3 text-center">
                <h3 className={`text-sm font-medium ${
                  step.status === 'current' || step.status === 'completed'
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}>
                  {step.label}
                </h3>
                {showDescriptions && step.description && (
                  <p className={`mt-1 text-xs ${
                    step.status === 'current' || step.status === 'completed'
                      ? 'text-gray-600'
                      : 'text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                )}
                {step.status === 'error' && (
                  <p className="mt-1 text-xs text-red-600">
                    Needs attention
                  </p>
                )}
              </div>
            </div>
            
            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="flex items-center">
                <div className={getConnectorClasses(index)} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Predefined progress configurations for common flows
export const progressConfigs = {
  logoCreation: (currentStep: string, hasInspiration = false): ProgressStep[] => [
    ...(hasInspiration ? [{
      id: 'inspiration',
      label: 'Inspiration',
      description: 'Selected from gallery',
      status: 'completed' as const
    }] : []),
    {
      id: 'business-info',
      label: 'Business Info',
      description: 'Company details and preferences',
      status: currentStep === 'business-info' ? 'current' as const : 
             ['ai-generation', 'editing', 'export'].includes(currentStep) ? 'completed' as const : 'pending' as const
    },
    {
      id: 'ai-generation',
      label: 'AI Generation',
      description: 'Generate logo variations',
      status: currentStep === 'ai-generation' ? 'current' as const : 
             ['editing', 'export'].includes(currentStep) ? 'completed' as const : 'pending' as const
    },
    {
      id: 'editing',
      label: 'Editing',
      description: 'Refine and customize',
      status: currentStep === 'editing' ? 'current' as const : 
             currentStep === 'export' ? 'completed' as const : 'pending' as const,
      optional: true
    },
    {
      id: 'export',
      label: 'Export',
      description: 'Download final logo',
      status: currentStep === 'export' ? 'current' as const : 'pending' as const
    }
  ],

  adminWorkflow: (currentStep: string): ProgressStep[] => [
    {
      id: 'login',
      label: 'Login',
      description: 'Authenticate access',
      status: ['upload', 'manage'].includes(currentStep) ? 'completed' as const : 
             currentStep === 'login' ? 'current' as const : 'pending' as const
    },
    {
      id: 'upload',
      label: 'Upload',
      description: 'Add new content',
      status: currentStep === 'upload' ? 'current' as const : 
             currentStep === 'manage' ? 'completed' as const : 'pending' as const
    },
    {
      id: 'manage',
      label: 'Manage',
      description: 'Organize and edit',
      status: currentStep === 'manage' ? 'current' as const : 'pending' as const
    }
  ]
}; 