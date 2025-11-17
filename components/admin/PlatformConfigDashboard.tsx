'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ConfigService } from '@/lib/database/configService'
import {
  PlatformConfig,
  CONFIG_FIELDS_METADATA,
  CONFIG_CONSTRAINTS,
} from '@/types/platformConfig'

export default function PlatformConfigDashboard() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedValues, setEditedValues] = useState<
    Partial<Omit<PlatformConfig, 'id' | 'updatedAt' | 'updatedBy'>>
  >({})
  const [hasChanges, setHasChanges] = useState(false)

  // Group fields by category
  const categories = ['safety', 'applications', 'lifecycle', 'payments', 'reviews'] as const

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const platformConfig = await ConfigService.getConfig()
      setConfig(platformConfig)
      setEditedValues({})
      setHasChanges(false)
    } catch {
      showError('Failed to load platform configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleValueChange = (
    key: keyof Omit<PlatformConfig, 'id' | 'updatedAt' | 'updatedBy'>,
    value: string
  ) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return

    setEditedValues((prev) => ({ ...prev, [key]: numValue }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!user || user.userType !== 'admin' || !hasChanges) return

    try {
      setSaving(true)
      await ConfigService.updateConfig(editedValues, user.id)
      success('Configuration updated successfully')
      await loadConfig()
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Failed to update configuration'
      )
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (
      !user ||
      user.userType !== 'admin' ||
      !confirm(
        'Are you sure you want to reset all settings to defaults? This cannot be undone.'
      )
    )
      return

    try {
      setSaving(true)
      await ConfigService.resetToDefaults(user.id)
      success('Configuration reset to defaults')
      await loadConfig()
    } catch (error) {
      showError('Failed to reset configuration')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    try {
      await ConfigService.refreshCache()
      await loadConfig()
      success('Configuration refreshed')
    } catch {
      showError('Failed to refresh configuration')
    }
  }

  const handleDiscard = () => {
    setEditedValues({})
    setHasChanges(false)
  }

  const getCurrentValue = (
    key: keyof Omit<PlatformConfig, 'id' | 'updatedAt' | 'updatedBy'>
  ): number => {
    if (key in editedValues) {
      return editedValues[key] as number
    }
    return config?.[key] as number || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Failed to load configuration</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Platform Configuration
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage platform-wide settings and timeouts
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Last Updated Info */}
      {config.updatedAt && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Last updated:{' '}
            {config.updatedAt instanceof Date
              ? config.updatedAt.toLocaleString()
              : typeof config.updatedAt === 'object' && 'toDate' in config.updatedAt
              ? (config.updatedAt as { toDate: () => Date }).toDate().toLocaleString()
              : new Date(config.updatedAt).toLocaleString()}{' '}
            {config.updatedBy === 'system' ? 'by System' : `by ${user?.firstName || 'Admin'}`}
          </p>
        </div>
      )}

      {/* Configuration Forms by Category */}
      {categories.map((category) => {
        const fieldsInCategory = CONFIG_FIELDS_METADATA.filter(
          (field) => field.category === category
        )

        if (fieldsInCategory.length === 0) return null

        return (
          <div
            key={category}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              {category}
            </h2>
            <div className="space-y-4">
              {fieldsInCategory.map((field) => {
                const currentValue = getCurrentValue(field.key)
                const constraints = CONFIG_CONSTRAINTS[field.key]
                const hasError =
                  field.key in editedValues &&
                  (currentValue < constraints.min ||
                    currentValue > constraints.max)

                return (
                  <div key={field.key} className="space-y-2">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        {field.label}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {field.description}
                      </p>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={constraints.min}
                        max={constraints.max}
                        step={field.key === 'safetyCheckIntervalHours' ? 0.5 : 1}
                        value={currentValue}
                        onChange={(e) =>
                          handleValueChange(field.key, e.target.value)
                        }
                        className={`w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          hasError
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300'
                        }`}
                      />
                      <span className="text-sm text-gray-600">{field.unit}</span>
                      {field.key in editedValues && (
                        <span className="text-xs text-blue-600 font-medium">
                          (Modified)
                        </span>
                      )}
                    </div>
                    {hasError && (
                      <p className="text-xs text-red-600">
                        Value must be between {constraints.min} and{' '}
                        {constraints.max}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Valid range: {constraints.min} - {constraints.max}{' '}
                      {field.unit}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {hasChanges && (
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="px-6 py-2 bg-white text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Discard
            </button>
          )}
        </div>
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-6 py-2 bg-red-50 text-red-700 font-medium border border-red-200 rounded-lg hover:bg-red-100"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
