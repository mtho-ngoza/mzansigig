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
  platformFeePercentage: string
  paymentProcessingFeePercentage: string
  fixedTransactionFee: string
  workerCommissionPercentage: string
  minimumGigAmount: string
  minimumWithdrawal: string
  minimumMilestone: string
  escrowReleaseDelayHours: string
  vatPercentage: string
  autoReleaseEnabled: boolean
  vatIncluded: boolean
}

export default function FeeConfigManager() {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()

  const [configs, setConfigs] = useState<PaymentConfig[]>([])
  const [activeConfig, setActiveConfig] = useState<PaymentConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [formData, setFormData] = useState<FeeConfigFormData>({
    platformFeePercentage: '5',
    paymentProcessingFeePercentage: '2.9',
    fixedTransactionFee: '2.50',
    workerCommissionPercentage: '10',
    minimumGigAmount: '100',
    minimumWithdrawal: '50',
    minimumMilestone: '50',
    escrowReleaseDelayHours: '72',
    vatPercentage: '15',
    autoReleaseEnabled: true,
    vatIncluded: true
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

    // Validate percentages
    const platformFee = parseFloat(formData.platformFeePercentage)
    if (isNaN(platformFee) || platformFee < 0 || platformFee > 50) {
      newErrors.platformFeePercentage = 'Must be between 0% and 50%'
    }

    const processingFee = parseFloat(formData.paymentProcessingFeePercentage)
    if (isNaN(processingFee) || processingFee < 0 || processingFee > 10) {
      newErrors.paymentProcessingFeePercentage = 'Must be between 0% and 10%'
    }

    const workerCommission = parseFloat(formData.workerCommissionPercentage)
    if (isNaN(workerCommission) || workerCommission < 0 || workerCommission > 30) {
      newErrors.workerCommissionPercentage = 'Must be between 0% and 30%'
    }

    // Validate amounts
    const fixedFee = parseFloat(formData.fixedTransactionFee)
    if (isNaN(fixedFee) || fixedFee < 0 || fixedFee > 100) {
      newErrors.fixedTransactionFee = 'Must be between R0 and R100'
    }

    const minGig = parseFloat(formData.minimumGigAmount)
    if (isNaN(minGig) || minGig < 10 || minGig > 10000) {
      newErrors.minimumGigAmount = 'Must be between R10 and R10,000'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FeeConfigFormData, value: string | boolean) => {
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
        platformFeePercentage: parseFloat(formData.platformFeePercentage),
        paymentProcessingFeePercentage: parseFloat(formData.paymentProcessingFeePercentage),
        fixedTransactionFee: parseFloat(formData.fixedTransactionFee),
        workerCommissionPercentage: parseFloat(formData.workerCommissionPercentage),
        minimumGigAmount: parseFloat(formData.minimumGigAmount),
        minimumWithdrawal: parseFloat(formData.minimumWithdrawal),
        minimumMilestone: parseFloat(formData.minimumMilestone),
        maximumPaymentAmount: 100000, // R100,000 max per transaction
        largePaymentThreshold: 10000, // R10,000 requires confirmation
        escrowReleaseDelayHours: parseInt(formData.escrowReleaseDelayHours),
        autoReleaseEnabled: formData.autoReleaseEnabled,
        enabledProviders: ['paystack', 'ozow', 'yoco'],
        defaultProvider: 'paystack',
        vatIncluded: formData.vatIncluded,
        vatPercentage: parseFloat(formData.vatPercentage),
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
        <h1 className="text-2xl font-bold text-gray-900">Fee Configuration Management</h1>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Platform Fee</p>
                <p className="font-semibold">{formatPercentage(activeConfig.platformFeePercentage)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Worker Commission</p>
                <p className="font-semibold">{formatPercentage(activeConfig.workerCommissionPercentage)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Processing Fee</p>
                <p className="font-semibold">{formatPercentage(activeConfig.paymentProcessingFeePercentage)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fixed Fee</p>
                <p className="font-semibold">{formatCurrency(activeConfig.fixedTransactionFee)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Min Gig Amount</p>
                <p className="font-semibold">{formatCurrency(activeConfig.minimumGigAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Escrow Delay</p>
                <p className="font-semibold">{activeConfig.escrowReleaseDelayHours}h</p>
              </div>
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
              {/* Fee Percentages */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Platform Fee (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.platformFeePercentage}
                  onChange={(e) => handleInputChange('platformFeePercentage', e.target.value)}
                  error={errors.platformFeePercentage}
                />
                <Input
                  label="Worker Commission (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={formData.workerCommissionPercentage}
                  onChange={(e) => handleInputChange('workerCommissionPercentage', e.target.value)}
                  error={errors.workerCommissionPercentage}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Processing Fee (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.paymentProcessingFeePercentage}
                  onChange={(e) => handleInputChange('paymentProcessingFeePercentage', e.target.value)}
                  error={errors.paymentProcessingFeePercentage}
                />
                <Input
                  label="Fixed Transaction Fee (ZAR)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.fixedTransactionFee}
                  onChange={(e) => handleInputChange('fixedTransactionFee', e.target.value)}
                  error={errors.fixedTransactionFee}
                />
              </div>

              {/* Minimum Amounts */}
              <div className="grid grid-cols-3 gap-4">
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
                  label="Min Withdrawal (ZAR)"
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.minimumWithdrawal}
                  onChange={(e) => handleInputChange('minimumWithdrawal', e.target.value)}
                />
                <Input
                  label="Min Milestone (ZAR)"
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.minimumMilestone}
                  onChange={(e) => handleInputChange('minimumMilestone', e.target.value)}
                />
              </div>

              {/* Other Settings */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Escrow Release Delay (hours)"
                  type="number"
                  min="0"
                  max="720"
                  value={formData.escrowReleaseDelayHours}
                  onChange={(e) => handleInputChange('escrowReleaseDelayHours', e.target.value)}
                />
                <Input
                  label="VAT Percentage (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={formData.vatPercentage}
                  onChange={(e) => handleInputChange('vatPercentage', e.target.value)}
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.autoReleaseEnabled}
                    onChange={(e) => handleInputChange('autoReleaseEnabled', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Enable automatic escrow release</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.vatIncluded}
                    onChange={(e) => handleInputChange('vatIncluded', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">VAT included in prices</span>
                </label>
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
          <CardTitle>All Configurations</CardTitle>
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
                      <p className="text-xs text-gray-500">Platform Fee</p>
                      <p className="text-sm font-medium">{formatPercentage(config.platformFeePercentage)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Worker Commission</p>
                      <p className="text-sm font-medium">{formatPercentage(config.workerCommissionPercentage)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Fixed Fee</p>
                      <p className="text-sm font-medium">{formatCurrency(config.fixedTransactionFee)}</p>
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