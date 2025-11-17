'use client'

import React, { useState } from 'react'
import { useMessaging } from '@/contexts/MessagingContext'
import { useAuth } from '@/contexts/AuthContext'
import { MessagingHub } from './MessagingHub'
import { Button } from '@/components/ui/Button'

interface MessageIndicatorProps {
  onConversationStart?: (conversationId: string) => void
  className?: string
}

export function MessageIndicator({
  onConversationStart: _onConversationStart,
  className = ''
}: MessageIndicatorProps) {
  const { user } = useAuth()
  const { totalUnreadCount } = useMessaging()
  const [showMessaging, setShowMessaging] = useState(false)

  if (!user) return null

  const handleToggleMessaging = () => {
    setShowMessaging(!showMessaging)
  }

  const handleClose = () => {
    setShowMessaging(false)
  }

  return (
    <>
      {/* Message Indicator Button */}
      <div className={`relative ${className}`}>
        <Button
          onClick={handleToggleMessaging}
          variant="outline"
          size="sm"
          className="relative"
          title="Messages"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Messaging Hub Modal/Dropdown */}
      {showMessaging && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <div className="absolute top-4 right-4 w-full max-w-4xl h-[calc(100vh-2rem)] max-h-[600px]">
            <MessagingHub
              onClose={handleClose}
              initialConversationId={undefined}
              className="h-full"
            />
          </div>
        </div>
      )}
    </>
  )
}