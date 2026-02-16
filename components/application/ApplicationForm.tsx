'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { isProfileComplete } from '@/lib/auth/firebase'
import { Gig } from '@/types/gig'
import { useToast } from '@/contexts/ToastContext'
import { usePayment } from '@/contexts/PaymentContext'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'
import { VerificationNudge } from '@/components/safety/VerificationNudge'
import { validateProposedRate, APPLICATION_TEXT_LIMITS } from '@/lib/utils/applicationValidation'
import {
  EXPERIENCE_YEARS_OPTIONS,
  EQUIPMENT_OPTIONS,
  APPLICATION_AVAILABILITY_OPTIONS
} from '@/lib/constants/formOptions'
import BankDetailsForm from '@/components/wallet/BankDetailsForm'

interface ApplicationFormProps {
  gig: Gig
  onSuccess?: () => void
  onCancel?: () => void
}

interface ApplicationFormData {
  message: string
  proposedRate: string
  experience: string
  availability: string
  equipment: string
}

export default function ApplicationForm({ gig, onSuccess, onCancel }: ApplicationFormProps) {
  const { success, error: showError } = useToast()
  const { user, refreshUser } = useAuth()
  const { calculateGigFees } = usePayment()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<ApplicationFormData>>({})
  const [warnings, setWarnings] = useState<Partial<Record<keyof ApplicationFormData, string>>>({})
  const [workerEarnings, setWorkerEarnings] = useState<number>(gig.budget)
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [formData, setFormData] = useState<ApplicationFormData>({
    message: '',
    proposedRate: gig.budget.toString(),
    experience: '',
    availability: '',
    equipment: ''
  })
  // Track user interaction with proposedRate and prevent unwanted resets
  const userHasEditedRate = useRef(false)
  const initialRatePrefilled = useRef(false)

  // Reset prefill guards when gig changes and set a sensible default before fees load
  useEffect(() => {
    userHasEditedRate.current = false
    initialRatePrefilled.current = false
    setFormData(prev => ({
      ...prev,
      proposedRate: gig.budget.toString()
    }))
    setWorkerEarnings(gig.budget)
  }, [gig.id, gig.budget])

  // Calculate worker's net earnings and prefill proposed rate once (unless user edits)
  useEffect(() => {
    let canceled = false
    const currentGigId = gig.id
    const loadWorkerEarnings = async () => {
      try {
        const breakdown = await calculateGigFees(gig.budget)
        // If this effect is stale (gig changed or unmounted), ignore result
        if (canceled || currentGigId !== gig.id) return

        setWorkerEarnings(breakdown.workerEarnings)
        // Prefill only once per gig load and do not override if user has edited
        if (!initialRatePrefilled.current && !userHasEditedRate.current) {
          const net = Number(breakdown?.workerEarnings)
          if (Number.isFinite(net) && net > 0) {
            setFormData(prev => ({
              ...prev,
              proposedRate: net.toString()
            }))
            initialRatePrefilled.current = true
          }
        }
      } catch (error) {
        console.error('Error calculating worker earnings:', error)
      }
    }
    loadWorkerEarnings()
    return () => {
      canceled = true
    }
  }, [gig.id, gig.budget, calculateGigFees])

  // Pre-fill experience and equipment from user profile
  // NOTE: We do NOT pre-fill availability because the profile stores work schedule preference
  // (e.g., "Full-time", "Part-time") while this form asks about start date (e.g., "immediately", "within-week").
  // Guarded to avoid infinite update loops when `user` reference changes frequently.
  // - Depend only on stable primitives from `user` (id and specific fields)
  // - Inside, only update state if values actually change; otherwise return prev to bail out.
  useEffect(() => {
    if (!user) return;

    setFormData(prev => {
      // Use nullish coalescing for numbers so 0 is preserved; for strings, ignore empty strings
      const nextExperience = user.experienceYears ?? prev.experience;
      const nextEquipment = user.equipmentOwnership || prev.equipment;

      const noChange =
        nextExperience === prev.experience &&
        nextEquipment === prev.equipment;

      if (noChange) {
        return prev;
      }

      return {
        ...prev,
        experience: nextExperience,
        equipment: nextEquipment
      };
    });
  }, [user?.id, user?.experienceYears, user?.equipmentOwnership])

  // Determine if this is a physical/informal work category
  const isPhysicalWork = ['Construction', 'Transportation', 'Cleaning', 'Healthcare'].includes(gig.category)

  // Get appropriate field labels and prompts
  const getFieldConfig = () => {
    if (isPhysicalWork) {
      return {
        mainFieldLabel: 'Brief Message (Optional)',
        mainFieldPlaceholder: `Add a quick note if you'd like (optional).\nFor example: "I'm available this week and have my own tools."`,
        showExperience: true,
        showAvailability: true,
        showEquipment: gig.category === 'Construction' || gig.category === 'Cleaning'
      }
    } else {
      return {
        mainFieldLabel: 'Message (Optional)',
        mainFieldPlaceholder: 'Add a brief message if you have something specific to mention (optional)...',
        showExperience: false,
        showAvailability: false,
        showEquipment: false
      }
    }
  }

  const fieldConfig = getFieldConfig()

  const handleInputChange = (field: keyof ApplicationFormData, value: string) => {
    // Mark that user has edited the proposed rate to prevent future auto-prefill overrides
    if (field === 'proposedRate') {
      userHasEditedRate.current = true
    }
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<ApplicationFormData> = {}
    const newWarnings: Partial<Record<keyof ApplicationFormData, string>> = {}

    // Message validation with max length
    if (formData.message.trim()) {
      if (formData.message.trim().length < APPLICATION_TEXT_LIMITS.MESSAGE_MIN) {
        newErrors.message = `Message must be at least ${APPLICATION_TEXT_LIMITS.MESSAGE_MIN} characters if provided`
      } else if (formData.message.length > APPLICATION_TEXT_LIMITS.MESSAGE_MAX) {
        newErrors.message = `Message cannot exceed ${APPLICATION_TEXT_LIMITS.MESSAGE_MAX} characters`
      }
    }

    // Proposed rate validation with max limit and warnings
    if (!formData.proposedRate.trim()) {
      newErrors.proposedRate = 'Proposed rate is required'
    } else {
      const rate = parseFloat(formData.proposedRate)
      if (isNaN(rate) || rate <= 0) {
        newErrors.proposedRate = 'Proposed rate must be a valid positive number'
      } else {
        const rateValidation = validateProposedRate(rate, gig.budget)
        if (!rateValidation.isValid) {
          newErrors.proposedRate = rateValidation.message
        } else if (rateValidation.warning) {
          newWarnings.proposedRate = rateValidation.warning
        }
      }
    }

    setErrors(newErrors)
    setWarnings(newWarnings)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showError('You must be logged in to apply for a gig')
      return
    }

    if (!isProfileComplete(user)) {
      showError('Please complete your profile with ID number before applying')
      return
    }

    if (!validateForm()) {
      return
    }

    // Check if worker has bank details - required for TradeSafe payout
    if (!user.bankDetails?.bankName || !user.bankDetails?.accountNumber) {
      setPendingSubmit(true)
      setShowBankDetailsModal(true)
      return
    }

    setIsSubmitting(true)

    try {
      // Check if user has already applied
      const hasApplied = await GigService.hasUserApplied(gig.id, user.id)
      if (hasApplied) {
        showError('You have already applied to this gig')
        setIsSubmitting(false)
        return
      }
      // Build application data with structured fields
      const applicationData = {
        gigId: gig.id,
        applicantId: user.id,
        applicantName: `${user.firstName} ${user.lastName}`,
        employerId: gig.employerId,
        message: formData.message.trim() || undefined,
        proposedRate: parseFloat(formData.proposedRate),
        // Include structured fields for physical work (enables filtering/sorting)
        ...(isPhysicalWork && formData.experience && { experience: formData.experience }),
        ...(isPhysicalWork && formData.availability && { availability: formData.availability }),
        ...(isPhysicalWork && formData.equipment && { equipment: formData.equipment })
      }

      await GigService.createApplication(applicationData)

      if (onSuccess) {
        onSuccess()
      } else {
        success('Sharp! Your application has been submitted')
        setFormData({
          message: '',
          proposedRate: workerEarnings.toString(),
          experience: '',
          availability: '',
          equipment: ''
        })
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      // Show specific error message (e.g., application limit reached, duplicate application, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application. Please try again.'
      showError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle bank details saved - refresh user and continue with submission
  const handleBankDetailsSaved = async () => {
    setShowBankDetailsModal(false)
    await refreshUser()
    if (pendingSubmit) {
      setPendingSubmit(false)
      // Re-trigger form submission with a synthetic event
      const form = document.querySelector('form') as HTMLFormElement
      if (form) {
        form.requestSubmit()
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Apply for: {gig.title}</CardTitle>
          <p className="text-gray-600">
            Submit your application to {gig.employerName} for this opportunity.
          </p>
        </CardHeader>

        <CardContent>
          {/* Gig Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Gig Details</h4>

            {/* Payment Breakdown */}
            <div className="mb-4">
              <GigAmountDisplay budget={gig.budget} showBreakdown={true} variant="compact" />
            </div>

            {/* Other Details */}
            <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-gray-200">
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2">{gig.duration}</span>
              </div>
              <div>
                <span className="text-gray-600">Location:</span>
                <span className="ml-2">{gig.location}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Category:</span>
                <span className="ml-2">{gig.category}</span>
              </div>
            </div>

            {gig.skillsRequired.length > 0 && (
              <div className="mt-3">
                <span className="text-gray-600 text-sm">Required Skills:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {gig.skillsRequired.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Verification Nudge for unverified job seekers */}
          {user && !user.isVerified && (
            <div className="mb-6">
              <VerificationNudge variant="inline" showStats={false} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Application Field */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                {fieldConfig.mainFieldLabel}
              </label>
              <textarea
                id="message"
                rows={4}
                placeholder={fieldConfig.mainFieldPlaceholder}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                maxLength={APPLICATION_TEXT_LIMITS.MESSAGE_MAX}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.message ? 'border-red-500' : ''
                }`}
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.message.length}/{APPLICATION_TEXT_LIMITS.MESSAGE_MAX} characters · Your profile shows your skills, experience, and reviews. Add a brief message only if needed.
              </p>
            </div>

            {/* Quick Questions for Physical Work */}
            {isPhysicalWork && (
              <>
                {/* Show pre-filled message only when form values actually match user profile */}
                {((user?.experienceYears && formData.experience === user.experienceYears) ||
                  (user?.equipmentOwnership && formData.equipment === user.equipmentOwnership)) && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      💡 <strong>Great news!</strong> We&apos;ve pre-filled some information from your profile to save you time. You can update these if needed for this specific gig.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Experience */}
                  <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience
                  </label>
                  <select
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select experience</option>
                    {EXPERIENCE_YEARS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {user?.experienceYears && formData.experience === user.experienceYears && (
                    <p className="mt-1 text-xs text-green-600">✓ Pre-filled from your profile</p>
                  )}
                </div>

                {/* Availability */}
                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-2">
                    When can you start?
                  </label>
                  <select
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => handleInputChange('availability', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select availability</option>
                    {APPLICATION_AVAILABILITY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Equipment (for Construction/Cleaning) */}
                {fieldConfig.showEquipment && (
                  <div className="md:col-span-2">
                    <label htmlFor="equipment" className="block text-sm font-medium text-gray-700 mb-2">
                      Do you have your own tools/equipment?
                    </label>
                    <select
                      id="equipment"
                      value={formData.equipment}
                      onChange={(e) => handleInputChange('equipment', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select option</option>
                      {EQUIPMENT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {user?.equipmentOwnership && formData.equipment === user.equipmentOwnership && (
                      <p className="mt-1 text-xs text-green-600">✓ Pre-filled from your profile</p>
                    )}
                  </div>
                )}
                </div>
              </>
            )}

            {/* Proposed Rate */}
            <div>
              <label htmlFor="proposedRate" className="block text-sm font-medium text-gray-700 mb-2">
                Your Proposed Rate (ZAR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R</span>
                <Input
                  id="proposedRate"
                  type="number"
                  placeholder="5000"
                  value={formData.proposedRate}
                  onChange={(e) => handleInputChange('proposedRate', e.target.value)}
                  className={`pl-8 ${errors.proposedRate ? 'border-red-500' : ''}`}
                  min="50"
                  step="0.01"
                />
              </div>
              {errors.proposedRate && (
                <p className="mt-1 text-sm text-red-600">{errors.proposedRate}</p>
              )}
              {warnings.proposedRate && !errors.proposedRate && (
                <p className="mt-1 text-sm text-yellow-600">{warnings.proposedRate}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Based on the client&apos;s budget of R{gig.budget.toLocaleString()}, you&apos;ll earn R{workerEarnings.toLocaleString()} after platform fees. You can propose a different rate.
              </p>
            </div>

            {/* Application Tips */}
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
              <h5 className="font-semibold text-secondary-800 mb-2">💡 Application Tips</h5>
              <ul className="text-sm text-secondary-700 space-y-1">
                {isPhysicalWork ? (
                  <>
                    <li>• Mention how many years you&apos;ve been doing this work</li>
                    <li>• Tell them what tools or equipment you have</li>
                    <li>• Share when you can start the job</li>
                    <li>• Mention any similar jobs you&apos;ve done before</li>
                  </>
                ) : (
                  <>
                    <li>• Be specific about your relevant experience</li>
                    <li>• Mention any portfolio work or examples</li>
                    <li>• Explain your approach to the project</li>
                    <li>• Be professional and enthusiastic</li>
                  </>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bank Details Modal - Required before applying */}
      {showBankDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Bank Details Required</h3>
              <p className="text-sm text-gray-600 mt-1">
                Add your bank details to apply. This ensures you get paid directly when you complete work.
              </p>
            </div>
            <div className="p-4">
              <BankDetailsForm onSuccess={handleBankDetailsSaved} />
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBankDetailsModal(false)
                  setPendingSubmit(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
