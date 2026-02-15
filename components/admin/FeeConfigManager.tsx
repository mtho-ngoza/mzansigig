'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useToast } from '@/contexts/ToastContext'
import { PaymentConfig } from '@/types/payment'
import { FeeConfigService } from '@/lib/services/feeConfigService'
import { useAuth } from '@/contexts/AuthContext'

interface FeeConfigFormData {
  platformCommissionPercent: string
  minimumGigAmount: string
  maximumGigAmount: string
  escrowAutoReleaseDays: string
}

/**
 * Fee Configuration Manager (Admin)
 *
 * Simplified for TradeSafe payments:
 * - Platform commission (10%) - deducted from worker earnings
 * - Gig amount limits
 * - Escrow auto-release days
 */
export default function FeeConfigManager() {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()

  const [configs, setConfigs] = useState<PaymentConfig[]>([])
  const [activeConfig, setActiveConfig] = useState<PaymentConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [formData, setFormData] = useState<FeeConfigFormData>({
    platformCommissionPercent: '10',
    minimumGigAmount: '100',
    maximumGigAmount: '100000',
    escrowAutoReleaseDays: '7'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setIsLoading(true)
      const [allConfigs, currentConfig] = await Promise.all([
        FeeConfigService.getAllFeeConfigs(),
        FeeConfigService.getActiveFeeConfig()
      ])

      setConfigs(allConfigs)
      setActiveConfig(currentConfig)
    } catch (error) {
      console.error('Error loading fee configs:', error)
      showError('Failed to load fee configurations')
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const commission = parseFloat(formData.platformCommissionPercent)
    if (isNaN(commission) || commission < 0 || commission > 50) {
      newErrors.platformCommissionPercent = 'Must be between 0% and 50%'
    }

    const minGig = parseFloat(formData.minimumGigAmount)
    if (isNaN(minGig) || minGig < 10 || minGig > 10000) {
      newErrors.minimumGigAmount = 'Must be between R10 and R10,000'
    }

    const maxGig = parseFloat(formData.maximumGigAmount)
    if (isNaN(maxGig) || maxGig < 1000 || maxGig > 1000000) {
      newErrors.maximumGigAmount = 'Must be between R1,000 and R1,000,000'
    }

    const days = parseInt(formData.escrowAutoReleaseDays)
    if (isNaN(days) || days < 1 || days > 30) {
      newErrors.escrowAutoReleaseDays = 'Must be between 1 and 30 days'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FeeConfigFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showError('You must be logged in to create fee configurations')
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      const configData = {
        platformCommissionPercent: parseFloat(formData.platformCommissionPercent),
        minimumGigAmount: parseFloat(formData.minimumGigAmount),
        maximumGigAmount: parseFloat(formData.maximumGigAmount),
        escrowAutoReleaseDays: parseInt(formData.escrowAutoReleaseDays),
        isActive: true
      }

      await FeeConfigService.createFeeConfig(configData, user.id)
      showSuccess('Fee configuration created successfully')
      setShowCreateForm(false)
      await loadConfigs()
    } catch (error) {
      console.error('Error creating fee config:', error)
      showError('Failed to create fee configuration')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActivateConfig = async (configId: string) => {
    if (!user) {
      showError('You must be logged in to activate configurations')
      return
    }

    try {
      await FeeConfigService.updateFeeConfig(configId, { isActive: true }, user.id)
      showSuccess('Configuration activated successfully')
      await loadConfigs()
    } catch (error) {
      console.error('Error activating config:', error)
      showError('Failed to activate configuration')
    }
  }

  const formatPercentage = (value: number) => `${value}%`
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fee Configuration</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          Create New Configuration
        </Button>
      </div>

      {/* Active Configuration */}
      {activeConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Active Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Platform Commission</p>
                <p className="font-semibold">{formatPercentage(activeConfig.platformCommissionPercent)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Min Gig Amount</p>
                <p className="font-semibold">{formatCurrency(activeConfig.minimumGigAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Max Gig Amount</p>
                <p className="font-semibold">{formatCurrency(activeConfig.maximumGigAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Escrow Auto-Release</p>
                <p className="font-semibold">{activeConfig.escrowAutoReleaseDays} days</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Fee Model (TradeSafe):</strong> Employer pays exact gig amount.
                Worker receives {100 - activeConfig.platformCommissionPercent}% after {activeConfig.platformCommissionPercent}% platform commission.
              </p>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                Last updated: {activeConfig.updatedAt.toLocaleDateString()} at {activeConfig.updatedAt.toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Fee Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Platform Commission (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.platformCommissionPercent}
                  onChange={(e) => handleInputChange('platformCommissionPercent', e.target.value)}
                  error={errors.platformCommissionPercent}
                />
                <Input
                  label="Escrow Auto-Release (days)"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.escrowAutoReleaseDays}
                  onChange={(e) => handleInputChange('escrowAutoReleaseDays', e.target.value)}
                  error={errors.escrowAutoReleaseDays}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Gig Amount (ZAR)"
                  type="number"
                  min="10"
                  max="10000"
                  value={formData.minimumGigAmount}
                  onChange={(e) => handleInputChange('minimumGigAmount', e.target.value)}
                  error={errors.minimumGigAmount}
                />
                <Input
                  label="Max Gig Amount (ZAR)"
                  type="number"
                  min="1000"
                  max="1000000"
                  value={formData.maximumGigAmount}
                  onChange={(e) => handleInputChange('maximumGigAmount', e.target.value)}
                  error={errors.maximumGigAmount}
                />
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Creating...' : 'Create Configuration'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* All Configurations */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className={`p-4 border rounded-lg ${
                  config.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-xs text-gray-500">Commission</p>
                      <p className="text-sm font-medium">{formatPercentage(config.platformCommissionPercent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Min Gig</p>
                      <p className="text-sm font-medium">{formatCurrency(config.minimumGigAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Auto-Release</p>
                      <p className="text-sm font-medium">{config.escrowAutoReleaseDays} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm font-medium">{config.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  {!config.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleActivateConfig(config.id)}
                    >
                      Activate
                    </Button>
                  )}
                  {config.isActive && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
