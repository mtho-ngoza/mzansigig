'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { usePayment } from '@/contexts/PaymentContext'

export default function EarningsAnalytics() {
  const { analytics, formatCurrency } = usePayment()

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-600">Loading analytics...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics.totalEarnings)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-secondary-600">
                  {formatCurrency(analytics.totalPaid)}
                </p>
              </div>
              <div className="text-3xl">💸</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(analytics.pendingPayments)}
                </p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Gigs</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analytics.completedGigs}
                </p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Gig Value */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(analytics.averageGigValue)}
              </div>
              <div className="text-sm text-gray-600">Average Gig Value</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {analytics.completedGigs > 0
                  ? Math.round((analytics.totalEarnings / analytics.completedGigs) * 100) / 100
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {analytics.monthlyEarnings.length > 0
                  ? Math.round(analytics.totalEarnings / Math.max(analytics.monthlyEarnings.length, 1))
                  : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Monthly (ZAR)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Earnings Chart */}
      {analytics.monthlyEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyEarnings.map((month) => {
                const maxEarning = Math.max(...analytics.monthlyEarnings.map(m => m.amount))
                const widthPercentage = maxEarning > 0 ? (month.amount / maxEarning) * 100 : 0

                return (
                  <div key={month.month} className="flex items-center space-x-4">
                    <div className="w-16 text-sm text-gray-600 font-medium">
                      {new Date(month.month + '-01').toLocaleDateString('en-ZA', {
                        month: 'short',
                        year: '2-digit'
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-gradient-to-r from-secondary-500 to-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(widthPercentage, 5)}%` }}
                        >
                          {month.amount > 0 && (
                            <span className="text-white text-xs font-medium">
                              {formatCurrency(month.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Categories (if available) */}
      {analytics.topCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Earning Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCategories.slice(0, 5).map((category) => {
                const maxEarning = Math.max(...analytics.topCategories.map(c => c.earnings))
                const widthPercentage = maxEarning > 0 ? (category.earnings / maxEarning) * 100 : 0

                return (
                  <div key={category.category} className="flex items-center space-x-4">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {category.category}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(category.earnings)}
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full"
                          style={{ width: `${widthPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Usage */}
      {analytics.paymentMethodUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {analytics.paymentMethodUsage.map((method) => (
                <div key={method.method} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">
                    {method.method === 'card' ? '💳' :
                     method.method === 'bank' ? '🏦' :
                     method.method === 'mobile_money' ? '📱' : '💰'}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {method.count}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {method.method.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {analytics.completedGigs === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Analytics Yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Complete your first gigs to see detailed analytics about your earnings,
              performance, and payment trends.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}