'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { GigService } from '@/lib/database/gigService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import LocationAutocomplete from '@/components/location/LocationAutocomplete'
import { Gig } from '@/types/gig'

interface PostGigFormProps {
  editGig?: Gig
  onSuccess?: () => void
  onCancel?: () => void
}

interface GigFormData {
  title: string
  description: string
  category: string
  location: string
  budget: string
  duration: string
  skillsRequired: string
  deadline: string
  maxApplicants: string
  workType: 'remote' | 'physical' | 'hybrid'
}

const CATEGORIES = [
  'Technology',
  'Design',
  'Writing',
  'Marketing',
  'Construction',
  'Transportation',
  'Cleaning',
  'Education',
  'Healthcare',
  'Finance',
  'Legal',
  'Other'
]

const DURATIONS = [
  '1 day',
  '2-3 days',
  '1 week',
  '2 weeks',
  '1 month',
  '2-3 months',
  '3-6 months',
  '6+ months',
  'Ongoing'
]

// Smart workType suggestions based on category
const getSuggestedWorkType = (category: string): 'remote' | 'physical' | 'hybrid' => {
  const remoteCategories = ['Technology', 'Design', 'Writing', 'Marketing']
  const physicalCategories = ['Construction', 'Transportation', 'Cleaning', 'Healthcare']
  const hybridCategories = ['Education', 'Finance', 'Legal']

  if (remoteCategories.includes(category)) {
    return 'remote'
  } else if (physicalCategories.includes(category)) {
    return 'physical'
  } else if (hybridCategories.includes(category)) {
    return 'hybrid'
  }
  return 'physical' // Default for 'Other' and unknown categories
}

// Category-specific title examples
const getTitlePlaceholder = (category: string): string => {
  const examples: Record<string, string> = {
    'Technology': 'e.g., Website Development for Small Business',
    'Design': 'e.g., Logo Design for New Restaurant',
    'Writing': 'e.g., Blog Content Writing for Travel Website',
    'Marketing': 'e.g., Social Media Management for Local Shop',
    'Construction': 'e.g., Bathroom Renovation in Sandton',
    'Transportation': 'e.g., Furniture Delivery Service - Johannesburg to Pretoria',
    'Cleaning': 'e.g., Weekly Office Cleaning - 3 Rooms',
    'Education': 'e.g., Mathematics Tutoring for Grade 10 Student',
    'Healthcare': 'e.g., Home Nursing Care for Elderly Patient',
    'Finance': 'e.g., Bookkeeping Services for Small Business',
    'Legal': 'e.g., Contract Review and Legal Consultation',
    'Other': 'e.g., Describe your gig clearly and specifically'
  }
  return examples[category] || 'e.g., Describe your gig clearly and specifically'
}

export default function PostGigForm({ editGig, onSuccess, onCancel }: PostGigFormProps) {
  const { success, error: showError } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<GigFormData>>({})
  const [formData, setFormData] = useState<GigFormData>({
    title: '',
    description: '',
    category: '',
    location: '',
    budget: '',
    duration: '',
    skillsRequired: '',
    deadline: '',
    maxApplicants: '',
    workType: 'physical' // Default to physical work
  })

  // Populate form when editing
  useEffect(() => {
    if (editGig) {
      setFormData({
        title: editGig.title,
        description: editGig.description,
        category: editGig.category,
        location: editGig.location,
        budget: editGig.budget.toString(),
        duration: editGig.duration,
        skillsRequired: editGig.skillsRequired.join(', '),
        deadline: editGig.deadline ? (editGig.deadline instanceof Date ? editGig.deadline.toISOString().split('T')[0] : editGig.deadline) : '',
        maxApplicants: editGig.maxApplicants?.toString() || '',
        workType: editGig.workType
      })
    }
  }, [editGig])

  // Determine if this is an informal work category
  const isInformalWork = ['Construction', 'Transportation', 'Cleaning', 'Healthcare', 'Other'].includes(formData.category)

  // Get appropriate field configuration with category-specific skill examples
  const getSkillsConfig = () => {
    if (isInformalWork) {
      let placeholder = 'Describe what help you need'

      switch (formData.category) {
        case 'Cleaning':
          placeholder = 'e.g., House cleaning, Office cleaning, Deep cleaning, Window washing'
          break
        case 'Construction':
          placeholder = 'e.g., Painting, Plumbing, Electrical work, Carpentry, Brick laying'
          break
        case 'Transportation':
          placeholder = 'e.g., Moving furniture, Delivery service, Driver needed'
          break
        case 'Healthcare':
          placeholder = 'e.g., Home care, Elderly care, Nursing assistance'
          break
        case 'Other':
          placeholder = 'e.g., Garden maintenance, Pet care, Event help, General labor'
          break
      }

      return {
        label: 'What type of work do you need?',
        placeholder,
        helpText: 'Describe the specific help you need (optional)',
        required: false
      }
    } else {
      // Category-specific skill examples for professional/digital work
      let placeholder = 'e.g., React, Node.js, Database Design'

      switch (formData.category) {
        case 'Technology':
          placeholder = 'e.g., React, TypeScript, Node.js, Python, Database Design, AWS'
          break
        case 'Design':
          placeholder = 'e.g., Adobe Illustrator, Figma, Photoshop, UI/UX Design, Branding'
          break
        case 'Writing':
          placeholder = 'e.g., Content Writing, Copywriting, SEO, Proofreading, Research'
          break
        case 'Marketing':
          placeholder = 'e.g., Social Media, Google Ads, SEO, Email Marketing, Analytics'
          break
        case 'Education':
          placeholder = 'e.g., Mathematics, English, Science, Online Teaching, Curriculum Development'
          break
        case 'Finance':
          placeholder = 'e.g., Bookkeeping, QuickBooks, Tax Preparation, Financial Analysis, Payroll'
          break
        case 'Legal':
          placeholder = 'e.g., Contract Law, Legal Research, Compliance, Document Drafting'
          break
      }

      return {
        label: 'Skills Required',
        placeholder,
        helpText: 'Separate multiple skills with commas',
        required: true
      }
    }
  }

  const skillsConfig = getSkillsConfig()

  const handleInputChange = (field: keyof GigFormData, value: string) => {
    // Auto-update workType when category changes (smart suggestion)
    if (field === 'category' && value) {
      const suggestedWorkType = getSuggestedWorkType(value)
      setFormData(prev => ({
        ...prev,
        [field]: value,
        workType: suggestedWorkType
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<GigFormData> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 30) {
      newErrors.description = 'Description must be at least 30 characters'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.location) {
      newErrors.location = 'Location is required'
    }

    if (!formData.budget.trim()) {
      newErrors.budget = 'Budget is required'
    } else {
      const budgetNum = parseFloat(formData.budget)
      if (isNaN(budgetNum) || budgetNum <= 0) {
        newErrors.budget = 'Budget must be a valid positive number'
      } else if (budgetNum < 100) {
        newErrors.budget = 'Budget must be at least R100'
      }
    }

    if (!formData.duration) {
      newErrors.duration = 'Duration is required'
    }

    // Only validate skills if required (non-informal work categories)
    if (skillsConfig.required && !formData.skillsRequired.trim()) {
      newErrors.skillsRequired = 'At least one skill is required'
    }

    // Validate max applicants (optional, but must be valid positive integer if provided)
    if (formData.maxApplicants.trim()) {
      const maxApplicants = parseInt(formData.maxApplicants)
      if (isNaN(maxApplicants) || maxApplicants <= 0) {
        newErrors.maxApplicants = 'Max applicants must be a positive number'
      } else if (maxApplicants > 100) {
        newErrors.maxApplicants = 'Max applicants cannot exceed 100'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      showError('You must be logged in to post a gig')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Handle skills/work type differently for informal vs digital work
      let skillsArray: string[] = []

      if (formData.skillsRequired.trim()) {
        skillsArray = formData.skillsRequired
          .split(',')
          .map(skill => skill.trim())
          .filter(skill => skill.length > 0)
      } else if (isInformalWork) {
        // For informal work, use category as default skill if none provided
        skillsArray = [formData.category]
      }

      const gigData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: formData.location,
        budget: parseFloat(formData.budget),
        duration: formData.duration,
        skillsRequired: skillsArray,
        employerId: user.id,
        employerName: `${user.firstName} ${user.lastName}`,
        applicants: [],
        status: 'open' as const,
        workType: formData.workType,
        ...(formData.deadline && { deadline: new Date(formData.deadline) }),
        ...(formData.maxApplicants.trim() && { maxApplicants: parseInt(formData.maxApplicants) })
      }

      if (editGig) {
        // Update existing gig
        await GigService.updateGig(editGig.id, gigData)
        success('Gig updated successfully!')
      } else {
        // Create new gig
        await GigService.createGig(gigData)
        success('Gig posted successfully!')
        setFormData({
          title: '',
          description: '',
          category: '',
          location: '',
          budget: '',
          duration: '',
          skillsRequired: '',
          deadline: '',
          maxApplicants: '',
          workType: 'physical'
        })
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error(`Error ${editGig ? 'updating' : 'posting'} gig:`, error)
      showError(`Failed to ${editGig ? 'update' : 'post'} gig. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{editGig ? 'Edit Gig' : 'Post a New Gig'}</CardTitle>
        <p className="text-gray-600">
          Share your project details to find the right talent for your needs.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Gig Title *
            </label>
            <Input
              id="title"
              type="text"
              placeholder={formData.category ? getTitlePlaceholder(formData.category) : "e.g., Website Development for Small Business"}
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              rows={6}
              placeholder="Describe your project requirements, expectations, deliverables, and any specific instructions..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : ''
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.description.length}/500 characters (minimum 30)
            </p>
          </div>

          {/* Category and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : ''
                }`}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <LocationAutocomplete
                id="location"
                value={formData.location}
                onChange={(value) => handleInputChange('location', value)}
                placeholder="Search for city, township, or suburb..."
                error={errors.location}
                required
              />
              {formData.workType === 'remote' && (
                <p className="mt-1 text-xs text-gray-500">
                  💡 For remote work, location helps workers find opportunities in their timezone/region
                </p>
              )}
              {formData.workType === 'physical' && (
                <p className="mt-1 text-xs text-gray-500">
                  📍 Be specific - workers will travel to this location
                </p>
              )}
              {formData.workType === 'hybrid' && (
                <p className="mt-1 text-xs text-gray-500">
                  🔄 Location for on-site days - specify hybrid schedule in description
                </p>
              )}
            </div>
          </div>

          {/* Budget and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                Budget (ZAR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">R</span>
                <Input
                  id="budget"
                  type="number"
                  placeholder="5000"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  className={`pl-8 ${errors.budget ? 'border-red-500' : ''}`}
                  min="100"
                  step="100"
                />
              </div>
              {errors.budget && (
                <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">Minimum R100</p>
            </div>

            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Duration *
              </label>
              <select
                id="duration"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.duration ? 'border-red-500' : ''
                }`}
              >
                <option value="">Select duration</option>
                {DURATIONS.map(duration => (
                  <option key={duration} value={duration}>{duration}</option>
                ))}
              </select>
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
              )}
            </div>
          </div>

          {/* Work Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Work Type *
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="workType"
                  checked={formData.workType === 'remote'}
                  onChange={() => handleInputChange('workType', 'remote')}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">
                  <span className="text-sm font-medium">Remote</span>
                  <span className="ml-1 text-xs text-gray-500">(Work from anywhere)</span>
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="workType"
                  checked={formData.workType === 'physical'}
                  onChange={() => handleInputChange('workType', 'physical')}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">
                  <span className="text-sm font-medium">Physical</span>
                  <span className="ml-1 text-xs text-gray-500">(On-site work)</span>
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="workType"
                  checked={formData.workType === 'hybrid'}
                  onChange={() => handleInputChange('workType', 'hybrid')}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">
                  <span className="text-sm font-medium">Hybrid</span>
                  <span className="ml-1 text-xs text-gray-500">(Mix of remote & on-site)</span>
                </span>
              </label>
            </div>
            {formData.category && (
              <p className="mt-2 text-xs text-gray-500">
                💡 Auto-suggested based on {formData.category} category. You can change this if needed.
              </p>
            )}
          </div>

          {/* Skills Required / Work Description */}
          <div>
            <label htmlFor="skillsRequired" className="block text-sm font-medium text-gray-700 mb-2">
              {skillsConfig.label} {skillsConfig.required ? '*' : '(Optional)'}
            </label>
            <Input
              id="skillsRequired"
              type="text"
              placeholder={skillsConfig.placeholder}
              value={formData.skillsRequired}
              onChange={(e) => handleInputChange('skillsRequired', e.target.value)}
              className={errors.skillsRequired ? 'border-red-500' : ''}
            />
            {errors.skillsRequired && (
              <p className="mt-1 text-sm text-red-600">{errors.skillsRequired}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {skillsConfig.helpText}
            </p>
          </div>

          {/* Deadline and Max Applicants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                Application Deadline (Optional)
              </label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="mt-1 text-sm text-gray-500">
                When should applications close?
              </p>
            </div>

            <div>
              <label htmlFor="maxApplicants" className="block text-sm font-medium text-gray-700 mb-2">
                Max Applicants (Optional)
              </label>
              <Input
                id="maxApplicants"
                type="number"
                placeholder="e.g., 5"
                value={formData.maxApplicants}
                onChange={(e) => handleInputChange('maxApplicants', e.target.value)}
                className={errors.maxApplicants ? 'border-red-500' : ''}
                min="1"
                max="100"
              />
              {errors.maxApplicants && (
                <p className="mt-1 text-sm text-red-600">{errors.maxApplicants}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Limit the number of applications you review
              </p>
            </div>
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
              {isSubmitting
                ? (editGig ? 'Updating...' : 'Posting...')
                : (editGig ? 'Update Gig' : 'Post Gig')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}