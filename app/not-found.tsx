import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-md w-full text-center">
        {/* Large 404 with brand colors */}
        <div className="text-8xl font-bold mb-4">
          <span className="text-primary-600">4</span>
          <span className="text-secondary-600">0</span>
          <span className="text-primary-600">4</span>
        </div>

        {/* Warm, South African voice heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Eish! This page took a wrong turn
        </h1>

        {/* Friendly explanation */}
        <p className="text-lg text-gray-600 mb-2">
          Looks like this page doesn&apos;t exist, or it&apos;s taken a detour through the kasi.
        </p>

        <p className="text-gray-500 mb-8">
          But don&apos;t worry - we&apos;ll get you back on track!
        </p>

        {/* Action buttons with brand colors */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              Back to Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Helpful suggestions */}
        <div className="mt-12 text-left bg-secondary-50 border border-secondary-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-3">
            Looking for something specific?
          </h2>
          <ul className="space-y-2 text-secondary-700">
            <li>
              <Link href="/" className="hover:text-secondary-900 hover:underline">
                → Browse available gigs
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-secondary-900 hover:underline">
                → View your dashboard
              </Link>
            </li>
            <li>
              <Link href="/profile" className="hover:text-secondary-900 hover:underline">
                → Manage your profile
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
