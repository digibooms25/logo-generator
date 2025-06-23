import Link from 'next/link';
import { ArrowLeft, ArrowRight, Sparkles, Building, Palette, Download } from 'lucide-react';

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Create Logo</h1>
            </div>
            <Link
              href="/gallery"
              className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Browse Gallery
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm font-medium text-indigo-600">Business Info</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Inspiration</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Generate</span>
            </div>
            
            <div className="w-16 h-0.5 bg-gray-300"></div>
            
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-600 rounded-full text-sm font-medium">
                4
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Customize</span>
            </div>
          </div>
        </div>

        {/* Step 1: Business Information */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex items-center mb-6">
            <Building className="h-6 w-6 text-indigo-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
          </div>
          
          <p className="text-gray-600 mb-8">
            Help our AI understand your brand by providing some basic information about your business.
          </p>

          <form className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter your company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select 
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select your industry</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
                <option value="food_beverage">Food & Beverage</option>
                <option value="automotive">Automotive</option>
                <option value="real_estate">Real Estate</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Select business type</option>
                <option value="startup">Startup</option>
                <option value="small_business">Small Business</option>
                <option value="enterprise">Enterprise</option>
                <option value="nonprofit">Nonprofit</option>
                <option value="personal_brand">Personal Brand</option>
                <option value="ecommerce">E-commerce</option>
              </select>
            </div>

            {/* Brand Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your brand (optional)
              </label>
              <textarea
                rows={4}
                placeholder="What does your company do? What makes it unique? What values does it represent?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience (optional)
              </label>
              <input
                type="text"
                placeholder="Who are your customers? (e.g., young professionals, families, businesses)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Style Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred Style (select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Minimalist', 'Modern', 'Classic', 'Playful', 'Professional', 'Creative', 'Bold', 'Elegant'].map((style) => (
                  <label key={style} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{style}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Color Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Color Preferences (optional)
              </label>
              <div className="flex flex-wrap gap-3">
                {['Blue', 'Green', 'Red', 'Purple', 'Orange', 'Black', 'Gray', 'Gold'].map((color) => (
                  <label key={color} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{color}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <Link
                href="/"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              
              <button
                type="submit"
                className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Continue to Inspiration
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        {/* AI Generation Preview (shown in later steps) */}
        <div className="hidden bg-white rounded-lg shadow-sm border p-8 mt-8">
          <div className="flex items-center mb-6">
            <Sparkles className="h-6 w-6 text-indigo-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">AI-Generated Logos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-500 transition-colors cursor-pointer">
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                  <div className="text-gray-400 text-sm">Generated Logo {index}</div>
                </div>
                <div className="text-center">
                  <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                    Select & Customize
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 