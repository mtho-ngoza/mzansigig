'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  Message,
  Conversation,
  ConversationPreview,
  MessageInput,
  MessagingState
} from '@/types/messaging'
import { MessagingService } from '@/lib/database/messagingService'
import { useAuth } from './AuthContext'

interface MessagingContextType extends MessagingState {
  // Conversation management
  startConversation: (
    otherUserId: string,
    otherUserName: string,
    otherUserType: 'job-seeker' | 'employer' | 'admin',
    gigId?: string,
    gigTitle?: string
  ) => Promise<string>

  setActiveConversation: (conversationId: string | null) => Promise<void>
  loadConversationMessages: (conversationId: string) => Promise<void>

  // Message operations
  sendMessage: (message: MessageInput) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>

  // Real-time updates
  refreshConversations: () => Promise<void>
  refreshUnreadCount: () => Promise<void>

  // Archive operations
  archiveConversation: (conversationId: string) => Promise<void>
  unarchiveConversation: (conversationId: string) => Promise<void>
  getArchivedConversations: () => Promise<ConversationPreview[]>

  // Utility
  getConversationById: (conversationId: string) => ConversationPreview | null
  isLoading: boolean
  error: string | null
  clearError: () => void
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined)

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider')
  }
  return context
}

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time subscriptions
  useEffect(() => {
    if (!user || !isAuthenticated) {
      setConversations([])
      setActiveConversationState(null)
      setMessages([])
      setTotalUnreadCount(0)
      return
    }

    // Subscribe to conversations
    const unsubscribeConversations = MessagingService.subscribeToConversations(
      user.id,
      (updatedConversations) => {
        setConversations(updatedConversations)
        const newUnreadCount = updatedConversations.reduce((total, conv) => total + conv.unreadCount, 0)
        setTotalUnreadCount(newUnreadCount)
      }
    )

    return () => {
      unsubscribeConversations()
    }
  }, [user, isAuthenticated])

  // Subscribe to messages for active conversation
  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      return
    }

    const unsubscribeMessages = MessagingService.subscribeToMessages(
      activeConversation.id,
      (updatedMessages) => {
        setMessages(updatedMessages)
      }
    )

    return () => {
      unsubscribeMessages()
    }
  }, [activeConversation])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback((error: Error) => {
    console.error('Messaging error:', error)
    setError(error.message)
    setIsLoading(false)
  }, [])

  const startConversation = useCallback(async (
    otherUserId: string,
    otherUserName: string,
    otherUserType: 'job-seeker' | 'employer' | 'admin',
    gigId?: string,
    gigTitle?: string
  ): Promise<string> => {
    if (!user) throw new Error('User not authenticated')

    try {
      setIsLoading(true)
      setError(null)

      const conversationId = await MessagingService.getOrCreateConversation(
        user.id,
        otherUserId,
        otherUserName,
        otherUserType,
        gigId,
        gigTitle,
        `${user.firstName} ${user.lastName}`,
        user.userType
      )

      setIsLoading(false)
      return conversationId
    } catch (error) {
      handleError(error as Error)
      throw error
    }
  }, [user, handleError])

  const setActiveConversation = useCallback(async (conversationId: string | null): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!conversationId) {
        setActiveConversationState(null)
        setMessages([])
        setIsLoading(false)
        return
      }

      const conversation = await MessagingService.getConversationById(conversationId, user?.id)
      setActiveConversationState(conversation)

      // Mark messages as read when opening conversation
      if (conversation && user) {
        await MessagingService.markMessagesAsRead(conversationId, user.id)
      }

      setIsLoading(false)
    } catch (error) {
      handleError(error as Error)
    }
  }, [user, handleError])

  const loadConversationMessages = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const conversationMessages = await MessagingService.getConversationMessages(conversationId)
      setMessages(conversationMessages.reverse()) // Show oldest first

      setIsLoading(false)
    } catch (error) {
      handleError(error as Error)
    }
  }, [handleError])

  const sendMessage = useCallback(async (messageInput: MessageInput): Promise<void> => {
    if (!user || !activeConversation) {
      throw new Error('No active conversation or user not authenticated')
    }

    try {
      setError(null)

      await MessagingService.sendMessage(
        activeConversation.id,
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.userType,
        messageInput
      )

      // Messages will be updated via real-time subscription
    } catch (error) {
      handleError(error as Error)
      throw error
    }
  }, [user, activeConversation, handleError])

  const markAsRead = useCallback(async (conversationId: string): Promise<void> => {
    if (!user) return

    try {
      await MessagingService.markMessagesAsRead(conversationId, user.id)
      // Conversations will be updated via real-time subscription
    } catch (error) {
      handleError(error as Error)
    }
  }, [user, handleError])

  const refreshConversations = useCallback(async (): Promise<void> => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const userConversations = await MessagingService.getUserConversations(user.id)
      setConversations(userConversations)

      const newUnreadCount = userConversations.reduce((total, conv) => total + conv.unreadCount, 0)
      setTotalUnreadCount(newUnreadCount)

      setIsLoading(false)
    } catch (error) {
      handleError(error as Error)
    }
  }, [user, handleError])

  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    if (!user) return

    try {
      const count = await MessagingService.getTotalUnreadCount(user.id)
      setTotalUnreadCount(count)
    } catch (error) {
      handleError(error as Error)
    }
  }, [user, handleError])

  const archiveConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null)
      await MessagingService.archiveConversation(conversationId)
      // Conversations will be updated via real-time subscription
    } catch (error) {
      handleError(error as Error)
      throw error
    }
  }, [handleError])

  const unarchiveConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null)
      await MessagingService.unarchiveConversation(conversationId)
      // Conversations will be updated via real-time subscription
    } catch (error) {
      handleError(error as Error)
      throw error
    }
  }, [handleError])

  const getArchivedConversations = useCallback(async (): Promise<ConversationPreview[]> => {
    if (!user) return []

    try {
      return await MessagingService.getArchivedConversations(user.id)
    } catch (error) {
      handleError(error as Error)
      return []
    }
  }, [user, handleError])

  const getConversationById = useCallback((conversationId: string): ConversationPreview | null => {
    return conversations.find(conv => conv.id === conversationId) || null
  }, [conversations])

  const value: MessagingContextType = {
    // State
    conversations,
    activeConversation,
    messages,
    totalUnreadCount,
    isLoading,
    error,

    // Actions
    startConversation,
    setActiveConversation,
    loadConversationMessages,
    sendMessage,
    markAsRead,
    refreshConversations,
    refreshUnreadCount,
    archiveConversation,
    unarchiveConversation,
    getArchivedConversations,
    getConversationById,
    clearError
  }

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  )
}