import Link from 'next/link';
import { Search, Sparkles, Settings, Palette } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Sparkles className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">AI Logo Generator</h1>
            </div>
            <nav className="flex space-x-4">
              <Link
                href="/gallery"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/create"
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Create Logo
              </Link>
              <Link
                href="/admin"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Create <span className="text-indigo-600">Professional Logos</span> with AI
          </h2>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Browse inspiration galleries, describe your business, and let our AI generate 
            stunning professional logos. Edit with natural language commands and export 
            in multiple formats.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/gallery"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Search className="mr-2 h-5 w-5" />
              Browse Gallery
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Creating
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-gray-900">How It Works</h3>
            <p className="mt-4 text-lg text-gray-600">Three simple steps to your perfect logo</p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100">
                  <Search className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
              <h4 className="mt-4 text-xl font-semibold text-gray-900">1. Browse & Inspire</h4>
              <p className="mt-2 text-gray-600">
                Explore our curated gallery of professional logos to find inspiration 
                for your brand.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100">
                  <Sparkles className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
              <h4 className="mt-4 text-xl font-semibold text-gray-900">2. Describe & Generate</h4>
              <p className="mt-2 text-gray-600">
                Tell us about your business and let our AI create unique logo 
                variations tailored to your brand.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="flex justify-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100">
                  <Palette className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
              <h4 className="mt-4 text-xl font-semibold text-gray-900">3. Edit & Export</h4>
              <p className="mt-2 text-gray-600">
                Fine-tune your logo with natural language commands and download 
                in multiple formats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 AI Logo Generator. Powered by AI technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
