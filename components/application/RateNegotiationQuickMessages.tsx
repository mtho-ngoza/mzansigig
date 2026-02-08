'use client'

import React, { useState } from 'react'
import { useMessaging } from '@/contexts/MessagingContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'

interface RateNegotiationQuickMessagesProps {
  recipientId: string
  recipientName: string
  recipientType: 'job-seeker' | 'employer'
  gigId: string
  gigTitle: string
  currentRate?: number
  viewerRole: 'worker' | 'employer'
  onConversationStart?: (conversationId: string) => void
  onClose?: () => void
}

const WORKER_TEMPLATES = [
  { label: 'Discuss rate', message: "I'd like to discuss the rate before we finalize. Do you have a moment to chat?" },
  { label: 'Job assessment', message: "After looking at the job details more closely, I think we should discuss the rate. The scope seems [larger/different] than initially described." },
  { label: 'Suggest rate', message: "I'd be comfortable taking this on for R{RATE}. Would that work for you?" },
  { label: 'Flexible', message: "I'm flexible on the rate. What budget range did you have in mind?" },
]

const EMPLOYER_TEMPLATES = [
  { label: 'Budget constraints', message: "I'd like to discuss the rate. My budget for this job is around R{RATE}. Is there room to negotiate?" },
  { label: 'Request breakdown', message: "Can you help me understand the rate breakdown? I want to make sure we're aligned on what's included." },
  { label: 'Counter offer', message: "Thank you for your application. I can offer R{RATE} for this job. Would that work for you?" },
  { label: 'Questions first', message: "Before we finalize the rate, I have a few questions about your approach to this job." },
]

export default function RateNegotiationQuickMessages({
  recipientId,
  recipientName,
  recipientType,
  gigId,
  gigTitle,
  currentRate,
  viewerRole,
  onConversationStart,
  onClose
}: RateNegotiationQuickMessagesProps) {
  const { user, isAuthenticated } = useAuth()
  const { startConversation } = useMessaging()
  const { error, warning, success } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const templates = viewerRole === 'worker' ? WORKER_TEMPLATES : EMPLOYER_TEMPLATES

  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '—'
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
  }

  const handleSelectTemplate = (template: typeof templates[0]) => {
    const rateText = currentRate != null ? currentRate.toString() : ''
    const message = template.message.replace('{RATE}', rateText)
    setCustomMessage(message)
    setSelectedTemplate(template.label)
  }

  const handleSendMessage = async () => {
    if (!isAuthenticated || !user) {
      warning('Please sign in to send messages')
      return
    }

    if (!customMessage.trim()) {
      warning('Please enter a message')
      return
    }

    try {
      setIsLoading(true)

      // Start or get existing conversation
      const conversationId = await startConversation(
        recipientId,
        recipientName,
        recipientType,
        gigId,
        gigTitle
      )

      // Send the message using MessagingService directly (context requires active conversation)
      const { MessagingService } = await import('@/lib/database/messagingService')
      await MessagingService.sendMessage(
        conversationId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.userType,
        { content: customMessage.trim(), type: 'text' }
      )

      success('Message sent!')
      onConversationStart?.(conversationId)
      onClose?.()
    } catch (err) {
      console.error('Error sending message:', err)
      error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Quick messages about rate for &quot;{gigTitle}&quot;
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Current rate: {formatCurrency(currentRate)}
        </p>
      </div>

      {/* Template buttons */}
      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button
            key={template.label}
            onClick={() => handleSelectTemplate(template)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedTemplate === template.label
                ? 'bg-primary-100 border-primary-500 text-primary-700'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {template.label}
          </button>
        ))}
      </div>

      {/* Custom message input */}
      <div>
        <label htmlFor="quickMessage" className="block text-xs font-medium text-gray-600 mb-1">
          Your message (edit or write your own):
        </label>
        <textarea
          id="quickMessage"
          value={customMessage}
          onChange={(e) => {
            setCustomMessage(e.target.value)
            setSelectedTemplate(null)
          }}
          placeholder="Type your message here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
          maxLength={500}
        />
        <p className="text-xs text-gray-400 mt-1">
          {customMessage.length}/500 characters
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onClose && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSendMessage}
          disabled={isLoading || !customMessage.trim()}
        >
          {isLoading ? 'Sending...' : 'Send Message'}
        </Button>
      </div>
    </div>
  )
}
