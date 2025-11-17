'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { SecurityService } from '@/lib/services/securityService'
import { EmergencyContact } from '@/types/auth'

interface EmergencyContactsManagerProps {
  onBack?: () => void
}

interface EmergencyContactForm {
  name: string
  phone: string
  relationship: string
  isPrimary: boolean
}

const RELATIONSHIP_OPTIONS = [
  'Spouse/Partner',
  'Parent',
  'Sibling',
  'Child',
  'Friend',
  'Colleague',
  'Neighbor',
  'Other Family'
]

export default function EmergencyContactsManager({ onBack }: EmergencyContactsManagerProps) {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<EmergencyContactForm>({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: false
  })

  useEffect(() => {
    loadEmergencyContacts()
  }, [user])

  const loadEmergencyContacts = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const preferences = await SecurityService.getSafetyPreferences(user.id)
      setContacts(preferences?.emergencyContacts || [])
    } catch (error) {
      console.error('Error loading emergency contacts:', error)
      showError('Failed to load emergency contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      showError('Please enter a name')
      return false
    }

    if (!formData.phone.trim()) {
      showError('Please enter a phone number')
      return false
    }

    // Basic SA phone number validation
    const phoneRegex = /^(\+27|0)[0-9]{9}$/
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      showError('Please enter a valid South African phone number')
      return false
    }

    if (!formData.relationship.trim()) {
      showError('Please select a relationship')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !validateForm()) return

    try {
      setIsSubmitting(true)

      // If setting as primary, unset other primary contacts
      if (formData.isPrimary) {
        contacts.forEach(contact => {
          if (contact.isPrimary && contact.id !== editingContact?.id) {
            SecurityService.updateEmergencyContact(user.id, contact.id, { isPrimary: false })
          }
        })
      }

      if (editingContact) {
        // Update existing contact
        await SecurityService.updateEmergencyContact(user.id, editingContact.id, {
          name: formData.name.trim(),
          phone: formData.phone.replace(/\s/g, ''),
          relationship: formData.relationship,
          isPrimary: formData.isPrimary
        })
        success('Emergency contact updated successfully')
      } else {
        // Add new contact
        await SecurityService.addEmergencyContact(user.id, {
          name: formData.name.trim(),
          phone: formData.phone.replace(/\s/g, ''),
          relationship: formData.relationship,
          isPrimary: formData.isPrimary
        })
        success('Sharp! Emergency contact saved')
      }

      // Reset form and reload contacts
      setFormData({ name: '', phone: '', relationship: '', isPrimary: false })
      setShowAddForm(false)
      setEditingContact(null)
      await loadEmergencyContacts()

    } catch (error) {
      console.error('Error saving emergency contact:', error)
      showError('Failed to save emergency contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (contact: EmergencyContact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary
    })
    setShowAddForm(true)
  }

  const handleDelete = async (contactId: string) => {
    if (!user || !confirm('Are you sure you want to remove this emergency contact?')) return

    try {
      await SecurityService.removeEmergencyContact(user.id, contactId)
      success('Emergency contact removed')
      await loadEmergencyContacts()
    } catch (error) {
      console.error('Error removing emergency contact:', error)
      showError('Failed to remove emergency contact')
    }
  }

  const cancelForm = () => {
    setShowAddForm(false)
    setEditingContact(null)
    setFormData({ name: '', phone: '', relationship: '', isPrimary: false })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergency Contacts</h1>
          <p className="text-gray-600 mt-1">
            Add trusted people who can be contacted in case of emergency during gigs
          </p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            ← Back to Safety
          </Button>
        )}
      </div>

      {/* Safety Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-secondary-100 p-2 rounded-full">
              <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">How Emergency Contacts Work</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your emergency contacts will be notified if you activate the emergency check-in during a gig,
                or if you don&apos;t check in when expected. Only contacts you mark as &quot;primary&quot; will receive
                immediate alerts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Contact Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="0xx xxx xxxx or +27xx xxx xxxx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <select
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  name="isPrimary"
                  checked={formData.isPrimary}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isPrimary" className="text-sm text-gray-700">
                  Primary contact (will receive immediate emergency alerts)
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Contacts List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Emergency Contacts ({contacts.length})
          </h2>
          {!showAddForm && contacts.length < 5 && (
            <Button onClick={() => setShowAddForm(true)}>
              + Add Contact
            </Button>
          )}
        </div>

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency Contacts Yet</h3>
              <p className="text-gray-600 mb-4">
                Add trusted people who can be contacted during emergencies
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                Add Your First Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                        {contact.isPrimary && (
                          <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{contact.phone}</p>
                      <p className="text-sm text-gray-500">{contact.relationship}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(contact)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(contact.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {contacts.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Tips for Emergency Contacts</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Choose people who are usually available and can respond quickly</li>
            <li>• Include at least one local contact who can physically assist if needed</li>
            <li>• Keep contact information up to date</li>
            <li>• Let your contacts know they&apos;re listed as emergency contacts</li>
            <li>• Mark your most reliable contact as &quot;primary&quot; for immediate alerts</li>
          </ul>
        </div>
      )}
    </div>
  )
}