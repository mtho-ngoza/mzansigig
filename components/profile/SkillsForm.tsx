'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileService } from '@/lib/database/profileService'
import { getProfileSectionConfig, isInformalWorker } from '@/lib/utils/userProfile'
import { useToast } from '@/contexts/ToastContext'

interface SkillsFormProps {
  onBack?: () => void
}

const POPULAR_SKILLS = {
  'Technology': [
    'JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'TypeScript',
    'Angular', 'Vue.js', 'PHP', 'Java', 'C#', 'SQL', 'MongoDB', 'AWS',
    'Docker', 'Git', 'REST APIs', 'GraphQL', 'Mobile Development'
  ],
  'Design': [
    'UI/UX Design', 'Graphic Design', 'Adobe Photoshop', 'Adobe Illustrator',
    'Figma', 'Sketch', 'InDesign', 'After Effects', 'Branding', 'Web Design',
    'Logo Design', 'Print Design', 'Animation', 'Prototyping'
  ],
  'Writing': [
    'Content Writing', 'Copywriting', 'Technical Writing', 'Blog Writing',
    'SEO Writing', 'Social Media Writing', 'Creative Writing', 'Editing',
    'Proofreading', 'Research', 'Grant Writing', 'Academic Writing'
  ],
  'Marketing': [
    'Digital Marketing', 'Social Media Marketing', 'SEO', 'PPC', 'Email Marketing',
    'Content Marketing', 'Analytics', 'Google Ads', 'Facebook Ads', 'Brand Strategy',
    'Market Research', 'Lead Generation', 'Conversion Optimization'
  ],
  'Physical': [
    'Construction', 'Plumbing', 'Electrical', 'Painting', 'Carpentry',
    'House Cleaning', 'Garden Maintenance', 'Moving Services', 'Handyman',
    'Vehicle Maintenance', 'Catering', 'Event Setup', 'Security'
  ]
}

const LANGUAGES = [
  'English', 'Afrikaans', 'Zulu', 'Xhosa', 'Sotho', 'Tswana', 'Pedi',
  'Venda', 'Tsonga', 'Ndebele'
]

export default function SkillsForm({ onBack }: SkillsFormProps) {
  const { success, error: showError } = useToast()
  const { user, refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [newCertification, setNewCertification] = useState('')
  const [formData, setFormData] = useState({
    skills: user?.skills || [],
    languages: user?.languages || [],
    certifications: user?.certifications || []
  })

  if (!user) return null

  const isInformal = isInformalWorker(user)
  const config = getProfileSectionConfig(user, 'skills')

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim()
    if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, trimmedSkill]
      }))
    }
    setNewSkill('')
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const toggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(lang => lang !== language)
        : [...prev.languages, language]
    }))
  }

  const addCertification = () => {
    const trimmedCert = newCertification.trim()
    if (trimmedCert && !formData.certifications.includes(trimmedCert)) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, trimmedCert]
      }))
    }
    setNewCertification('')
  }

  const removeCertification = (certToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert !== certToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await ProfileService.updateProfile(user.id, {
        skills: formData.skills,
        languages: formData.languages,
        certifications: formData.certifications
      })
      await ProfileService.updateProfileCompleteness(user.id)
      await refreshUser()

      success('Lekker! Skills updated')
      if (onBack) onBack()
    } catch (err) {
      console.error('Error updating skills:', err)
      showError('Failed to update skills. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back to Profile
            </Button>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {config?.title || 'Skills & Languages'}
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              {config?.description || 'Add your skills, languages, and certifications to showcase your expertise.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Skills Section */}
          <Card>
            <CardHeader>
              <CardTitle>{isInformal ? 'Your Skills' : 'Skills & Expertise'}</CardTitle>
              <p className="text-gray-600">
                {isInformal ? 'Tell people what you can do and how well you do it' : 'Add skills that highlight your capabilities'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Custom Skill */}
              <div>
                <label htmlFor="newSkill" className="block text-sm font-medium text-gray-700 mb-2">
                  {isInformal ? 'Add what you can do' : 'Add Custom Skill'}
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="newSkill"
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder={isInformal ? "e.g., House cleaning, Garden work" : "Enter a skill"}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill(newSkill)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addSkill(newSkill)}
                    disabled={!newSkill.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Popular Skills */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {isInformal ? 'Types of work you can choose from' : 'Popular Skills'}
                </h4>
                {Object.entries(POPULAR_SKILLS).map(([category, skills]) => (
                  <div key={category} className="mb-4">
                    <h5 className="text-sm font-medium text-gray-600 mb-2">{category}</h5>
                    <div className="flex flex-wrap gap-2">
                      {skills.map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          disabled={formData.skills.includes(skill)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            formData.skills.includes(skill)
                              ? 'bg-primary-100 text-primary-700 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {skill} {formData.skills.includes(skill) ? '✓' : '+'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Skills */}
              {formData.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Your Skills ({formData.skills.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-2 text-primary-500 hover:text-primary-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Languages Section */}
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
              <p className="text-gray-600">Select languages you can communicate in</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {LANGUAGES.map(language => (
                  <label
                    key={language}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(language)}
                      onChange={() => toggleLanguage(language)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{language}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certifications Section */}
          <Card>
            <CardHeader>
              <CardTitle>{isInformal ? 'Certificates & Training' : 'Certifications & Qualifications'}</CardTitle>
              <p className="text-gray-600">{isInformal ? 'Add any certificates or training you have completed' : 'Add your professional certifications and qualifications'}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Certification */}
              <div>
                <label htmlFor="newCertification" className="block text-sm font-medium text-gray-700 mb-2">
                  Add Certification
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="newCertification"
                    type="text"
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    placeholder="e.g., AWS Certified Developer, Google Analytics Certified"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCertification()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCertification}
                    disabled={!newCertification.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Current Certifications */}
              {formData.certifications.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Your Certifications</h4>
                  <div className="space-y-2">
                    {formData.certifications.map((cert, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <span className="text-sm text-gray-900">{cert}</span>
                        <button
                          type="button"
                          onClick={() => removeCertification(cert)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
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
              {isSubmitting ? 'Saving...' : 'Save Skills'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}