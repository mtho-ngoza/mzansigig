'use client'

import React from 'react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'

interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  isCurrentPage?: boolean
}

interface ActionButton {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  icon?: React.ReactNode
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ActionButton[]
  backButton?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  backButton,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 sm:py-4">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-3 sm:mb-4">
              <Breadcrumb items={breadcrumbs} />
            </div>
          )}

          {/* Back Button */}
          {backButton && (
            <div className="mb-3 sm:mb-4">
              <Button
                variant="ghost"
                onClick={backButton.onClick}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backButton.label}
              </Button>
            </div>
          )}

          {/* Title and Actions */}
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-gray-500">
                  {description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {actions && actions.length > 0 && (
              <div className="ml-2 sm:ml-4 flex-shrink-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'primary'}
                    onClick={action.onClick}
                    className="inline-flex items-center"
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}