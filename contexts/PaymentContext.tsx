'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { PaymentService } from '@/lib/services/paymentService'
import {
  PaymentState,
  PaymentMethod,
  Payment,
  WithdrawalRequest,
  PaymentAnalytics,
  PaymentIntent,
  Milestone,
  BankAccount,
  FeeBreakdown
} from '@/types/payment'

interface PaymentContextType extends PaymentState {
  // Payment Methods
  addPaymentMethod: (paymentMethodData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PaymentMethod>
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<void>
  refreshPaymentMethods: () => Promise<void>

  // Payments
  createPaymentIntent: (
    gigId: string,
    workerId: string,
    amount: number,
    paymentMethodId: string,
    type?: 'milestone' | 'hourly' | 'fixed' | 'bonus'
  ) => Promise<PaymentIntent>
  processPayment: (paymentIntentId: string) => Promise<Payment>
  releaseEscrow: (paymentId: string, amount?: number) => Promise<void>

  // Milestones
  createMilestone: (gigId: string, title: string, description: string, amount: number, dueDate?: Date) => Promise<Milestone>
  updateMilestoneStatus: (milestoneId: string, status: Milestone['status'], paymentId?: string) => Promise<void>

  // Withdrawals
  requestWithdrawal: (amount: number, paymentMethodId: string, bankDetails?: BankAccount) => Promise<WithdrawalRequest>
  refreshWithdrawals: () => Promise<void>

  // Analytics
  refreshAnalytics: () => Promise<void>

  // Utility
  calculateFees: (amount: number) => Promise<{ platformFee: number; processingFee: number; fixedFee: number; totalFees: number; netAmount: number }>
  calculateGigFees: (amount: number) => Promise<FeeBreakdown>
  formatCurrency: (amount: number) => string
}

type PaymentAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAYMENT_METHODS'; payload: PaymentMethod[] }
  | { type: 'ADD_PAYMENT_METHOD'; payload: PaymentMethod }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'ADD_PAYMENT'; payload: Payment }
  | { type: 'UPDATE_PAYMENT'; payload: { id: string; updates: Partial<Payment> } }
  | { type: 'SET_WITHDRAWALS'; payload: WithdrawalRequest[] }
  | { type: 'ADD_WITHDRAWAL'; payload: WithdrawalRequest }
  | { type: 'SET_ANALYTICS'; payload: PaymentAnalytics | null }

const initialState: PaymentState = {
  paymentMethods: [],
  payments: [],
  withdrawals: [],
  analytics: null,
  isLoading: false,
  error: null
}

function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }

    case 'SET_PAYMENT_METHODS':
      return { ...state, paymentMethods: action.payload }

    case 'ADD_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethods: [action.payload, ...state.paymentMethods]
      }

    case 'SET_PAYMENTS':
      return { ...state, payments: action.payload }

    case 'ADD_PAYMENT':
      return {
        ...state,
        payments: [action.payload, ...state.payments]
      }

    case 'UPDATE_PAYMENT':
      return {
        ...state,
        payments: state.payments.map(payment =>
          payment.id === action.payload.id
            ? { ...payment, ...action.payload.updates }
            : payment
        )
      }

    case 'SET_WITHDRAWALS':
      return { ...state, withdrawals: action.payload }

    case 'ADD_WITHDRAWAL':
      return {
        ...state,
        withdrawals: [action.payload, ...state.withdrawals]
      }

    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload }

    default:
      return state
  }
}

export const PaymentContext = createContext<PaymentContextType | undefined>(undefined)

interface PaymentProviderProps {
  children: ReactNode
}

export function PaymentProvider({ children }: PaymentProviderProps) {
  const [state, dispatch] = useReducer(paymentReducer, initialState)
  const { user } = useAuth()

  // Load user data when authenticated
  useEffect(() => {
    if (user) {
      loadUserPaymentData()
    } else {
      // Clear data when logged out
      dispatch({ type: 'SET_PAYMENT_METHODS', payload: [] })
      dispatch({ type: 'SET_PAYMENTS', payload: [] })
      dispatch({ type: 'SET_WITHDRAWALS', payload: [] })
      dispatch({ type: 'SET_ANALYTICS', payload: null })
    }
  }, [user])

  const loadUserPaymentData = async () => {
    if (!user) return

    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Fix any multiple default payment methods first
      await PaymentService.fixMultipleDefaultPaymentMethods(user.id)

      // Load payment methods, analytics, and withdrawals in parallel
      const [paymentMethods, analytics, withdrawals] = await Promise.all([
        PaymentService.getUserPaymentMethods(user.id),
        PaymentService.getUserPaymentAnalytics(user.id),
        PaymentService.getUserWithdrawals(user.id)
      ])

      dispatch({ type: 'SET_PAYMENT_METHODS', payload: paymentMethods })
      dispatch({ type: 'SET_ANALYTICS', payload: analytics })
      dispatch({ type: 'SET_WITHDRAWALS', payload: withdrawals })
      dispatch({ type: 'SET_ERROR', payload: null })
    } catch (error) {
      console.error('Error loading payment data:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load payment data' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Payment Methods
  const addPaymentMethod = async (paymentMethodData: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const paymentMethod = await PaymentService.addPaymentMethod(user.id, paymentMethodData)

      // Refresh payment methods to ensure UI consistency after potential default changes
      await refreshPaymentMethods()

      dispatch({ type: 'SET_ERROR', payload: null })
      return paymentMethod
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      await PaymentService.setDefaultPaymentMethod(user.id, paymentMethodId)
      await refreshPaymentMethods()
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    }
  }

  const refreshPaymentMethods = async () => {
    if (!user) return

    try {
      // Fix any multiple default payment methods first
      await PaymentService.fixMultipleDefaultPaymentMethods(user.id)
      const paymentMethods = await PaymentService.getUserPaymentMethods(user.id)
      dispatch({ type: 'SET_PAYMENT_METHODS', payload: paymentMethods })
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  // Payments
  const createPaymentIntent = async (
    gigId: string,
    workerId: string,
    amount: number,
    paymentMethodId: string,
    type: 'milestone' | 'hourly' | 'fixed' | 'bonus' = 'fixed'
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const paymentIntent = await PaymentService.createPaymentIntent(
        gigId,
        user.id,
        workerId,
        amount,
        paymentMethodId,
        type
      )
      dispatch({ type: 'SET_ERROR', payload: null })
      return paymentIntent
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const processPayment = async (paymentIntentId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const payment = await PaymentService.processPayment(paymentIntentId)
      dispatch({ type: 'ADD_PAYMENT', payload: payment })

      // Refresh analytics after payment
      if (user) {
        const analytics = await PaymentService.getUserPaymentAnalytics(user.id)
        dispatch({ type: 'SET_ANALYTICS', payload: analytics })
      }

      dispatch({ type: 'SET_ERROR', payload: null })
      return payment
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const releaseEscrow = async (paymentId: string, amount?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await PaymentService.releaseEscrow(paymentId, amount)

      // Update payment in state
      dispatch({
        type: 'UPDATE_PAYMENT',
        payload: {
          id: paymentId,
          updates: {
            escrowStatus: 'released',
            status: 'completed',
            escrowReleaseDate: new Date(),
            completedAt: new Date()
          }
        }
      })

      // Refresh analytics
      if (user) {
        const analytics = await PaymentService.getUserPaymentAnalytics(user.id)
        dispatch({ type: 'SET_ANALYTICS', payload: analytics })
      }

      dispatch({ type: 'SET_ERROR', payload: null })
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Milestones
  const createMilestone = async (
    gigId: string,
    title: string,
    description: string,
    amount: number,
    dueDate?: Date
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const milestone = await PaymentService.createMilestone(gigId, title, description, amount, dueDate)
      dispatch({ type: 'SET_ERROR', payload: null })
      return milestone
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const updateMilestoneStatus = async (
    milestoneId: string,
    status: Milestone['status'],
    paymentId?: string
  ) => {
    try {
      await PaymentService.updateMilestoneStatus(milestoneId, status, paymentId)
      dispatch({ type: 'SET_ERROR', payload: null })
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    }
  }

  // Withdrawals
  const requestWithdrawal = async (
    amount: number,
    paymentMethodId: string,
    bankDetails?: BankAccount
  ) => {
    if (!user) throw new Error('User not authenticated')

    try {
      dispatch({ type: 'SET_LOADING', payload: true })

      // If new bank details provided, save them as a payment method first
      let actualPaymentMethodId = paymentMethodId
      if (bankDetails && paymentMethodId === 'new') {
        const newPaymentMethod = await PaymentService.addPaymentMethod(user.id, {
          type: 'bank' as const,
          provider: 'eft',
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          accountLast4: bankDetails.accountNumber.slice(-4),
          accountHolder: bankDetails.accountHolder,
          accountType: bankDetails.accountType,
          branchCode: bankDetails.branchCode,
          isDefault: false,
          isVerified: false
        })
        actualPaymentMethodId = newPaymentMethod.id

        // Refresh payment methods to show the newly added one
        await refreshPaymentMethods()
      }

      // Request withdrawal with saved payment method (no need to pass bankDetails anymore)
      const withdrawal = await PaymentService.requestWithdrawal(user.id, amount, actualPaymentMethodId, undefined)
      dispatch({ type: 'ADD_WITHDRAWAL', payload: withdrawal })

      // Refresh analytics
      const analytics = await PaymentService.getUserPaymentAnalytics(user.id)
      dispatch({ type: 'SET_ANALYTICS', payload: analytics })

      dispatch({ type: 'SET_ERROR', payload: null })
      return withdrawal
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // Analytics
  const refreshAnalytics = async () => {
    if (!user) return

    try {
      const analytics = await PaymentService.getUserPaymentAnalytics(user.id)
      dispatch({ type: 'SET_ANALYTICS', payload: analytics })
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  const refreshWithdrawals = async () => {
    if (!user) return

    try {
      const withdrawals = await PaymentService.getUserWithdrawals(user.id)
      dispatch({ type: 'SET_WITHDRAWALS', payload: withdrawals })
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  // Utility functions
  const calculateFees = async (amount: number) => {
    return await PaymentService.calculateFees(amount)
  }

  const calculateGigFees = async (amount: number) => {
    return await PaymentService.calculateGigFees(amount)
  }

  const formatCurrency = (amount: number) => {
    return PaymentService.formatCurrency(amount)
  }

  const value: PaymentContextType = {
    ...state,
    addPaymentMethod,
    setDefaultPaymentMethod,
    refreshPaymentMethods,
    createPaymentIntent,
    processPayment,
    releaseEscrow,
    createMilestone,
    updateMilestoneStatus,
    requestWithdrawal,
    refreshWithdrawals,
    refreshAnalytics,
    calculateFees,
    calculateGigFees,
    formatCurrency
  }

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  )
}

export function usePayment() {
  const context = useContext(PaymentContext)
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider')
  }
  return context
}