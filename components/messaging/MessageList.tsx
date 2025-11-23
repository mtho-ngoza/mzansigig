'use client'

import React from 'react'
import { Message } from '@/types/messaging'
import { format, isToday, isYesterday } from 'date-fns'
import { sanitizeForDisplay } from '@/lib/utils/textSanitization'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  isLoading?: boolean
}

export function MessageList({ messages, currentUserId, isLoading = false }: MessageListProps) {
  if (isLoading && messages.length === 0) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                i % 2 === 0 ? 'bg-gray-200' : 'bg-gray-100'
              }`}>
                <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
        <div className="text-center">
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
          <p className="font-medium">No messages yet</p>
          <p className="text-sm">Send a message to start the conversation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message, index) => {
        const isOwn = message.senderId === currentUserId
        const isSystem = message.senderId === 'system'
        const showDate = shouldShowDateSeparator(message, messages[index - 1])

        return (
          <div key={message.id}>
            {showDate && <DateSeparator date={message.createdAt} />}
            <MessageBubble
              message={message}
              isOwn={isOwn}
              isSystem={isSystem}
              showTimestamp={shouldShowTimestamp(message, messages[index + 1])}
            />
          </div>
        )
      })}
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isSystem: boolean
  showTimestamp: boolean
}

function MessageBubble({ message, isOwn, isSystem, showTimestamp }: MessageBubbleProps) {
  const formatTime = (date: DateLike) => {
    const safeDate = safeToDate(date);
    return format(safeDate, 'HH:mm')
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-600 px-3 py-2 rounded-full text-sm max-w-md text-center">
          {message.type === 'gig-update' && (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{message.content}</span>
            </div>
          )}
          {message.type === 'application-update' && (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{message.content}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        <div
          className={`px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {/* File attachment */}
          {message.type === 'file' && message.metadata?.fileUrl && (
            <div className="mb-2">
              <a
                href={message.metadata.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center space-x-2 p-2 rounded border ${
                  isOwn
                    ? 'border-primary-400 hover:border-primary-300'
                    : 'border-gray-300 hover:border-gray-400'
                } transition-colors`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {message.metadata.fileName || 'File attachment'}
                  </p>
                  {message.metadata.fileSize && (
                    <p className="text-xs opacity-75">
                      {formatFileSize(message.metadata.fileSize)}
                    </p>
                  )}
                </div>
              </a>
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {sanitizeForDisplay(message.content)}
            </p>
          )}
        </div>

        {/* Timestamp and read status */}
        {showTimestamp && (
          <div className={`mt-1 flex items-center space-x-2 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}>
            <span className="text-xs text-gray-500">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <div className="flex items-center">
                {message.isRead ? (
                  <svg className="w-3 h-3 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DateSeparator({ date }: { date: DateLike }) {
  const formatDate = (date: DateLike) => {
    try {
      const messageDate = safeToDate(date);

      if (isToday(messageDate)) {
        return 'Today'
      } else if (isYesterday(messageDate)) {
        return 'Yesterday'
      } else {
        return format(messageDate, 'MMMM d, yyyy')
      }
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Today';
    }
  }

  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
        {formatDate(date)}
      </span>
    </div>
  )
}

// Helper function to safely convert various date formats to Date object
type DateLike = Date | string | number | { toDate?: () => Date } | null | undefined;

function safeToDate(date: DateLike): Date {
  try {
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    // Handle Date object
    if (date instanceof Date) {
      return date;
    }
    // Handle string or number
    if (typeof date === 'string' || typeof date === 'number') {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return new Date(); // fallback to current date
      }
      return parsed;
    }
    // Fallback
    return new Date();
  } catch {
    return new Date();
  }
}

function shouldShowDateSeparator(currentMessage: Message, previousMessage?: Message): boolean {
  if (!previousMessage) return true

  const currentDate = safeToDate(currentMessage.createdAt)
  const previousDate = safeToDate(previousMessage.createdAt)

  return currentDate.toDateString() !== previousDate.toDateString()
}

function shouldShowTimestamp(currentMessage: Message, nextMessage?: Message): boolean {
  if (!nextMessage) return true

  const currentDate = safeToDate(currentMessage.createdAt)
  const nextDate = safeToDate(nextMessage.createdAt)
  const timeDiff = nextDate.getTime() - currentDate.getTime()

  // Show timestamp if messages are more than 5 minutes apart or from different senders
  return timeDiff > 5 * 60 * 1000 || currentMessage.senderId !== nextMessage.senderId
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}