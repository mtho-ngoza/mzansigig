'use client'

import React, { useState } from 'react'
import { ConversationPreview } from '@/types/messaging'
import { formatDistanceToNow } from 'date-fns'
import { useMessaging } from '@/contexts/MessagingContext'
import { sanitizeForDisplay } from '@/lib/utils/textSanitization'
import { sanitizeUsername } from '@/lib/utils/messageValidation'

interface ConversationListProps {
  conversations: ConversationPreview[]
  activeConversationId?: string
  onConversationSelect: (conversationId: string) => void
  isLoading?: boolean
}

export function ConversationList({
  conversations,
  activeConversationId,
  onConversationSelect,
  isLoading = false
}: ConversationListProps) {
  if (isLoading && conversations.length === 0) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-3">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="font-medium">No conversations yet</p>
        <p className="text-sm">Start a conversation by applying to a gig</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeConversationId}
          onClick={() => onConversationSelect(conversation.id)}
        />
      ))}
    </div>
  )
}

interface ConversationItemProps {
  conversation: ConversationPreview
  isActive: boolean
  onClick: () => void
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { archiveConversation, unarchiveConversation } = useMessaging()
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setIsArchiving(true)
      if (conversation.status === 'archived') {
        await unarchiveConversation(conversation.id)
      } else {
        await archiveConversation(conversation.id)
      }
    } catch (error) {
      console.error('Error toggling archive status:', error)
    } finally {
      setIsArchiving(false)
    }
  }

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) return 'No messages yet'

    const { content, type, senderId } = conversation.lastMessage
    const isFromOther = senderId !== 'you' // This would need to be properly determined

    switch (type) {
      case 'file':
        return `${isFromOther ? '' : 'You: '}📎 File attachment`
      case 'gig-update':
        return 'Gig was updated'
      case 'application-update':
        return 'Application status changed'
      default:
        const prefix = isFromOther ? '' : 'You: '
        const sanitizedContent = sanitizeForDisplay(content)
        return `${prefix}${sanitizedContent.length > 40 ? sanitizedContent.substring(0, 40) + '...' : sanitizedContent}`
    }
  }

  const formatTime = (date: Date | string | number | { toDate?: () => Date } | null | undefined) => {
    try {
      let dateObj: Date;

      // Handle Firestore Timestamp
      if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      }
      // Handle Date object
      else if (date instanceof Date) {
        dateObj = date;
      }
      // Handle string or number
      else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      }
      // Fallback
      else {
        return 'Just now';
      }

      if (isNaN(dateObj.getTime())) {
        return 'Just now';
      }

      return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch {
      return 'Just now'
    }
  }

  return (
    <div
      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100 touch-manipulation ${
        isActive ? 'bg-primary-50 border-primary-200' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Profile Avatar */}
        <div className="flex-shrink-0">
          {conversation.otherParticipant.profilePhoto ? (
            <img
              src={conversation.otherParticipant.profilePhoto}
              alt={sanitizeUsername(conversation.otherParticipant.userName)}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium text-sm">
                {sanitizeUsername(conversation.otherParticipant.userName).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Conversation Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {sanitizeUsername(conversation.otherParticipant.userName)}
            </h3>
            <div className="flex items-center space-x-1">
              {conversation.unreadCount > 0 && (
                <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {conversation.lastMessage && formatTime(conversation.lastMessage.createdAt)}
              </span>
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className="p-2 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors ml-1 touch-manipulation"
                title={conversation.status === 'archived' ? 'Unarchive conversation' : 'Archive conversation'}
              >
                {isArchiving ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg
                    className="w-4 h-4 text-gray-400 hover:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {conversation.status === 'archived' ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 01-.293.707V17a1 1 0 01-.553.894L12 19l-1.447-.553A1 1 0 0110 17v-2.586a1 1 0 01-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    )}
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Gig Title */}
          {conversation.gigTitle && (
            <p className="text-xs text-primary-600 font-medium mb-1 truncate">
              Re: {conversation.gigTitle}
            </p>
          )}

          {/* Last Message Preview */}
          <p className="text-sm text-gray-600 truncate">
            {getLastMessagePreview()}
          </p>

          {/* User Type Badge */}
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                conversation.otherParticipant.userType === 'employer'
                  ? 'bg-secondary-100 text-secondary-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {conversation.otherParticipant.userType === 'employer' ? 'Employer' : 'Job Seeker'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}