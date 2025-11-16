'use client'

import React from 'react'
import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-4">
              <img
                src="/logo-white.svg"
                alt="MzansiGig"
                className="h-10 w-auto"
              />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Mzansi&apos;s Gig Connection: Work Starts Here. Connecting all South Africans with safe, accessible gig opportunities.
            </p>
            <div className="flex space-x-4">
              {/* Social Media Icons - Placeholders */}
              <a href="#facebook" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook" onClick={(e) => e.preventDefault()}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#twitter" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter" onClick={(e) => e.preventDefault()}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#linkedin" className="text-gray-400 hover:text-white transition-colors" aria-label="LinkedIn" onClick={(e) => e.preventDefault()}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Platform Column */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Browse Gigs</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Post a Gig</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Safety Center</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Trust & Verification</a>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Help Center</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Contact Us</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Report an Issue</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Safety Tips</a>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">FAQs</a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Cookie Policy</a>
              </li>
              <li>
                <Link href="/popia" className="text-sm hover:text-white transition-colors">
                  POPIA Compliance
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm hover:text-white transition-colors">Dispute Resolution</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6 text-sm">
              <span>© {currentYear} MzansiGig Pty Ltd. All rights reserved.</span>
              <span className="hidden md:inline text-gray-500">•</span>
              <span className="hidden md:inline">Built with ❤️ for all of Mzansi</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <span className="mr-2">🇿🇦</span>
                English (South Africa)
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
