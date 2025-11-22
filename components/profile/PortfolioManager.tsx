'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileService } from '@/lib/database/profileService'
import { PortfolioItem } from '@/types/auth'
import { isInformalWorker, getProfileSectionConfig } from '@/lib/utils/userProfile'
import { useToast } from '@/contexts/ToastContext'
import {
  VALIDATION_LIMITS,
  QUANTITY_LIMITS,
  sanitizeText,
  enforceLength,
  canAddItem,
} from '@/lib/utils/profileValidation'

interface PortfolioManagerProps {
  onBack?: () => void
}

const PROFESSIONAL_PORTFOLIO_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'UI/UX Design',
  'Graphic Design',
  'Content Writing',
  'Marketing',
  'Photography',
  'Video Production',
  'Other'
]

const INFORMAL_WORK_CATEGORIES = [
  'House Cleaning',
  'Construction Work',
  'Garden Maintenance',
  'Painting',
  'Plumbing',
  'Electrical Work',
  'Moving & Transport',
  'Handyman Services',
  'Car Washing',
  'Event Setup',
  'Security Work',
  'Catering',
  'Childcare',
  'Elderly Care',
  'Pet Care',
  'Other'
]

export default function PortfolioManager({ onBack }: PortfolioManagerProps) {
  const { success, error: showError, warning } = useToast()
  const { user, refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    projectUrl: '',
    technologies: '',
    completedAt: '',
    imageFile: null as File | null
  })

  if (!user) return null

  const isInformal = isInformalWorker(user)
  const config = getProfileSectionConfig(user, 'portfolio')
  const portfolioCategories = isInformal ? INFORMAL_WORK_CATEGORIES : PROFESSIONAL_PORTFOLIO_CATEGORIES

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      projectUrl: '',
      technologies: '',
      completedAt: '',
      imageFile: null
    })
    setEditingItem(null)
    setShowAddForm(false)
  }

  const handleInputChange = (field: string, value: string) => {
    // Enforce length limits for title and description
    if (field === 'title') {
      setFormData(prev => ({
        ...prev,
        title: enforceLength(value, VALIDATION_LIMITS.PORTFOLIO_TITLE_MAX_LENGTH)
      }))
    } else if (field === 'description') {
      setFormData(prev => ({
        ...prev,
        description: enforceLength(value, VALIDATION_LIMITS.PORTFOLIO_DESCRIPTION_MAX_LENGTH)
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      warning('Please select an image file.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size must be less than 5MB.')
      return
    }

    setFormData(prev => ({ ...prev, imageFile: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Sanitize inputs
    const sanitizedTitle = sanitizeText(formData.title)
    const sanitizedDescription = sanitizeText(formData.description)

    if (!sanitizedTitle || !sanitizedDescription || !formData.category) {
      warning('Please fill in all required fields.')
      return
    }

    // Check if we can add more portfolio items (only when adding new, not editing)
    if (!editingItem) {
      const canAdd = canAddItem(currentPortfolio.length, QUANTITY_LIMITS.MAX_PORTFOLIO_ITEMS)
      if (!canAdd.canAdd) {
        showError(canAdd.message || `Maximum ${QUANTITY_LIMITS.MAX_PORTFOLIO_ITEMS} portfolio items allowed`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      let imageUrl = editingItem?.imageUrl || ''

      // Upload new image if one was selected
      if (formData.imageFile) {
        setIsUploading(true)
        imageUrl = await ProfileService.uploadPortfolioImage(user.id, formData.imageFile)
        setIsUploading(false)
      }

      const portfolioData: Omit<PortfolioItem, 'id'> = {
        title: sanitizedTitle,
        description: sanitizedDescription,
        category: formData.category,
        technologies: formData.technologies.trim()
          ? formData.technologies.split(',').map(tech => sanitizeText(tech)).filter(tech => tech)
          : [],
        completedAt: formData.completedAt ? new Date(formData.completedAt) : new Date()
      }

      // Only add optional fields if they have values
      if (formData.projectUrl && formData.projectUrl.trim()) {
        portfolioData.projectUrl = sanitizeText(formData.projectUrl)
      }

      if (imageUrl) {
        portfolioData.imageUrl = imageUrl
      }

      if (editingItem) {
        await ProfileService.updatePortfolioItem(user.id, editingItem.id, portfolioData)
      } else {
        await ProfileService.addPortfolioItem(user.id, portfolioData)
      }

      await ProfileService.updateProfileCompleteness(user.id)
      await refreshUser()

      success(`Sharp! Portfolio item ${editingItem ? 'updated' : 'added'}`)
      resetForm()
    } catch (err) {
      console.error('Error saving portfolio item:', err)
      showError(`Failed to ${editingItem ? 'update' : 'add'} portfolio item. Please try again.`)
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  const handleEdit = (item: PortfolioItem) => {
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      projectUrl: item.projectUrl || '',
      technologies: item.technologies?.join(', ') || '',
      completedAt: item.completedAt.toISOString().split('T')[0],
      imageFile: null
    })
    setEditingItem(item)
    setShowAddForm(true)
  }

  const handleDelete = async (item: PortfolioItem) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) {
      return
    }

    try {
      await ProfileService.deletePortfolioItem(user.id, item.id)
      await ProfileService.updateProfileCompleteness(user.id)
      await refreshUser()
      success('Portfolio item removed')
    } catch (err) {
      console.error('Error deleting portfolio item:', err)
      showError('Failed to delete portfolio item. Please try again.')
    }
  }

  const currentPortfolio = user.portfolio || []

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back to Profile
            </Button>
          )}

          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {config?.title || 'Portfolio'}
              </h1>
              <p className="text-gray-600">
                {config?.description || 'Showcase your best work to attract potential clients.'}
              </p>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm}
            >
              Add {isInformal ? 'Experience' : 'Portfolio Item'}
            </Button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      {isInformal ? 'Job Title *' : 'Project Title *'}
                    </label>
                    <Input
                      id="title"
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder={isInformal ? "e.g., House Cleaning for Mrs Smith" : "e.g., E-commerce Website for Local Business"}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      {isInformal ? 'Type of Work *' : 'Category *'}
                    </label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="">{isInformal ? 'Select type of work' : 'Select category'}</option>
                      {portfolioCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    {isInformal ? 'Tell us about this job *' : 'Description *'}
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder={isInformal
                      ? "What did you do? How big was the job? What made it special? Did the customer like your work?"
                      : "Describe the project, your role, challenges faced, and outcomes achieved..."
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Project URL and Technologies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="projectUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      Project URL (Optional)
                    </label>
                    <Input
                      id="projectUrl"
                      type="url"
                      value={formData.projectUrl}
                      onChange={(e) => handleInputChange('projectUrl', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="technologies" className="block text-sm font-medium text-gray-700 mb-2">
                      {isInformal ? 'Tools/Equipment Used' : 'Technologies Used'}
                    </label>
                    <Input
                      id="technologies"
                      type="text"
                      value={formData.technologies}
                      onChange={(e) => handleInputChange('technologies', e.target.value)}
                      placeholder={isInformal
                        ? "e.g., Vacuum cleaner, Pressure washer, Power drill"
                        : "React, Node.js, MongoDB (comma separated)"
                      }
                    />
                  </div>
                </div>

                {/* Completion Date and Image */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="completedAt" className="block text-sm font-medium text-gray-700 mb-2">
                      {isInformal ? 'When did you finish?' : 'Completion Date'}
                    </label>
                    <Input
                      id="completedAt"
                      type="date"
                      value={formData.completedAt}
                      onChange={(e) => handleInputChange('completedAt', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                      {isInformal ? 'Photo of your work' : 'Project Image'}
                    </label>
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Current Image Preview */}
                {(editingItem?.imageUrl || formData.imageFile) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.imageFile ? 'New Image Preview' : 'Current Image'}
                    </label>
                    <img
                      src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : editingItem?.imageUrl}
                      alt="Portfolio item"
                      className="w-48 h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={isSubmitting || isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    isLoading={isSubmitting || isUploading}
                  >
                    {isUploading ? 'Uploading...' : isSubmitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Portfolio Grid */}
        {currentPortfolio.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💼</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                No {isInformal ? 'Experience' : 'Portfolio Items'} Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {isInformal
                  ? 'Add your work experience to help clients understand your skills and background.'
                  : 'Start building your portfolio by adding your best work. This helps clients see what you can deliver.'
                }
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                {isInformal ? 'Add Your First Work Example' : 'Add Your First Portfolio Item'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentPortfolio.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {item.imageUrl && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                    {item.description}
                  </p>

                  {item.technologies && item.technologies.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {item.technologies.slice(0, 3).map((tech, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                        {item.technologies.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{item.technologies.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="text-xs text-gray-500">
                      Completed: {new Date(item.completedAt).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      {item.projectUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(item.projectUrl, '_blank')}
                        >
                          View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}