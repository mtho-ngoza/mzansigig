'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Conversation, MessageInput } from '@/types/messaging'
import { useMessaging } from '@/contexts/MessagingContext'
import { useAuth } from '@/contexts/AuthContext'
import { MessageList } from './MessageList'
import { MessageInputForm } from './MessageInputForm'

interface ChatWindowProps {
  conversation: Conversation
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const { user } = useAuth()
  const { messages, sendMessage, isLoading } = useMessaging()
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (messageInput: MessageInput) => {
    try {
      setIsTyping(false)
      await sendMessage(messageInput)
    } catch (error) {
      console.debug('Error sending message:', error)
      // Error handling is managed by the context
    }
  }

  const otherParticipant = conversation.participants.find(p => p.userId !== user?.id)

  if (!otherParticipant) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>Error: Unable to load conversation participant</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {/* Other user's avatar */}
          {otherParticipant.profilePhoto ? (
            <Image
              src={otherParticipant.profilePhoto}
              alt={otherParticipant.userName}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium text-sm">
                {otherParticipant.userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {otherParticipant.userName}
            </h3>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  otherParticipant.userType === 'employer'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {otherParticipant.userType === 'employer' ? 'Employer' : 'Job Seeker'}
              </span>
              {conversation.gigTitle && (
                <span className="text-xs text-gray-500 truncate">
                  • Re: {conversation.gigTitle}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        <MessageList
          messages={messages}
          currentUserId={user?.id || ''}
          isLoading={isLoading}
        />
        {isTyping && (
          <div className="px-4 py-2">
            <div className="flex items-center space-x-2 text-gray-500 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>{otherParticipant.userName} is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white">
        <MessageInputForm
          onSendMessage={handleSendMessage}
          onTyping={setIsTyping}
          disabled={isLoading}
          placeholder={`Message ${otherParticipant.userName}...`}
          conversationId={conversation.id}
        />
      </div>
    </div>
  )
}