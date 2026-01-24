'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Notification } from '@/types/notification'
import { NotificationService } from '@/lib/database/notificationService'
import { useAuth } from './AuthContext'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  // Actions
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const userNotifications = await NotificationService.getUserNotifications(user.id, 50, true)
      setNotifications(userNotifications)
      setUnreadCount(userNotifications.filter(n => !n.read).length)
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Load notifications on auth change
  useEffect(() => {
    if (isAuthenticated && user) {
      loadNotifications()
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [isAuthenticated, user, loadNotifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated, user, loadNotifications])

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      await NotificationService.markAllAsRead(user.id)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [user])

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId)
      await NotificationService.deleteNotification(notificationId)

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }, [notifications])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: loadNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
