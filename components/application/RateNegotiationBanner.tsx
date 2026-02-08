'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { GigApplication } from '@/types/gig'

interface RateNegotiationBannerProps {
  application: GigApplication
  viewerRole: 'worker' | 'employer'
  onUpdateRate: () => void
  onConfirmRate: () => void
  onMessage: () => void
  isProcessing?: boolean
}

export default function RateNegotiationBanner({
  application,
  viewerRole,
  onUpdateRate,
  onConfirmRate,
  onMessage,
  isProcessing = false
}: RateNegotiationBannerProps) {
  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '—'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  const { rateStatus, proposedRate, agreedRate, lastRateUpdate, gigBudget } = application

  // Don't show banner if rate is already agreed
  if (rateStatus === 'agreed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-medium text-green-800">Rate Agreed</span>
              <span className="ml-2 text-green-700 font-semibold">{formatCurrency(agreedRate || proposedRate)}</span>
            </div>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Ready to proceed
          </span>
        </div>
      </div>
    )
  }

  // Determine who proposed the current rate
  const lastProposedBy = lastRateUpdate?.by || 'worker'
  const currentRate = lastRateUpdate?.amount || proposedRate
  const isMyProposal = lastProposedBy === viewerRole
  const otherParty = viewerRole === 'worker' ? 'employer' : 'worker'

  // Status: Initial proposal by worker (employer hasn't responded)
  if (rateStatus === 'proposed' && viewerRole === 'employer') {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-base font-bold text-yellow-900">
              Rate Proposal - Action Required
            </h3>
            <p className="mt-1 text-sm text-yellow-800">
              {application.applicantName} proposed <strong>{formatCurrency(currentRate)}</strong>
              {gigBudget && currentRate !== gigBudget && (
                <span className="text-yellow-700"> (your budget: {formatCurrency(gigBudget)})</span>
              )}
            </p>
            {lastRateUpdate?.note && (
              <div className="mt-2 bg-yellow-100 rounded p-2 text-sm text-yellow-800 italic">
                &quot;{lastRateUpdate.note}&quot;
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={onConfirmRate}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept {formatCurrency(currentRate)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onUpdateRate}
                disabled={isProcessing}
              >
                Counter Offer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onMessage}
                disabled={isProcessing}
              >
                Message to Discuss
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Status: Initial proposal by worker (worker's view - waiting for employer)
  if (rateStatus === 'proposed' && viewerRole === 'worker') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Your Rate Proposal: {formatCurrency(currentRate)}
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Waiting for employer to accept or counter
            </p>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onUpdateRate}
                disabled={isProcessing}
                className="text-xs"
              >
                Update Your Rate
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Status: Countered - Other party proposed, waiting for my response
  if (rateStatus === 'countered' && !isMyProposal) {
    return (
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-base font-bold text-orange-900">
              {otherParty === 'worker' ? 'Worker' : 'Employer'} Counter Offer - Your Response Needed
            </h3>
            <p className="mt-1 text-sm text-orange-800">
              New proposed rate: <strong>{formatCurrency(currentRate)}</strong>
              {gigBudget && (
                <span className="text-orange-700"> (original budget: {formatCurrency(gigBudget)})</span>
              )}
            </p>
            {lastRateUpdate?.note && (
              <div className="mt-2 bg-orange-100 rounded p-2 text-sm text-orange-800 italic">
                &quot;{lastRateUpdate.note}&quot;
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={onConfirmRate}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                Accept {formatCurrency(currentRate)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onUpdateRate}
                disabled={isProcessing}
              >
                Counter Offer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onMessage}
                disabled={isProcessing}
              >
                Message to Discuss
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Status: Countered - I proposed, waiting for other party
  if (rateStatus === 'countered' && isMyProposal) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              Your Counter Offer: {formatCurrency(currentRate)}
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Waiting for {otherParty === 'worker' ? 'worker' : 'employer'} to respond
            </p>
            {lastRateUpdate?.note && (
              <div className="mt-2 bg-blue-100 rounded p-2 text-sm text-blue-700 italic">
                Your note: &quot;{lastRateUpdate.note}&quot;
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onUpdateRate}
                disabled={isProcessing}
                className="text-xs"
              >
                Update Your Offer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onMessage}
                disabled={isProcessing}
                className="text-xs"
              >
                Send Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}

// Rate status badge for compact display
export function RateStatusBadge({ rateStatus, agreedRate }: { rateStatus: GigApplication['rateStatus'], agreedRate?: number }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  switch (rateStatus) {
    case 'agreed':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Rate Agreed {agreedRate && `(${formatCurrency(agreedRate)})`}
        </span>
      )
    case 'countered':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
          Rate Negotiating
        </span>
      )
    case 'proposed':
    default:
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          Rate Proposed
        </span>
      )
  }
}
