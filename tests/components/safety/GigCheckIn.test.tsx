import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import GigCheckIn from '@/components/safety/GigCheckIn'
import { GigApplication } from '@/types/gig'
import { GigService } from '@/lib/database/gigService'

// Mock dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'worker-1', email: 'worker@test.com' }
  })
}))

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn()
  })
}))

jest.mock('@/contexts/LocationContext', () => ({
  useLocation: () => ({
    currentCoordinates: { latitude: -26.2041, longitude: 28.0473 },
    getEffectiveCoordinates: jest.fn().mockResolvedValue({ latitude: -26.2041, longitude: 28.0473 })
  })
}))

jest.mock('@/lib/database/gigService')

describe('GigCheckIn Component', () => {
  const mockApplication: GigApplication = {
    id: 'app-1',
    gigId: 'gig-1',
    applicantId: 'worker-1',
    applicantName: 'Worker Name',
    proposedRate: 500,
    status: 'funded',
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render for non-funded application', async () => {
    const nonFundedApp = { ...mockApplication, status: 'pending' as const }

    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: false,
      missedSafetyChecks: 0,
      needsSafetyCheck: false
    })

    const { container } = render(<GigCheckIn application={nonFundedApp} />)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should render check-in button when not checked in', async () => {
    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: false,
      missedSafetyChecks: 0,
      needsSafetyCheck: false
    })

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Check In at Gig Location')).toBeInTheDocument()
    })
  })

  it('should show checked-in status when worker is checked in', async () => {
    const checkInTime = new Date('2025-01-01T10:00:00Z')

    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: true,
      checkInAt: checkInTime,
      missedSafetyChecks: 0,
      needsSafetyCheck: false
    })

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Checked In')).toBeInTheDocument()
      expect(screen.getByText('Confirm I\'m Safe ✓')).toBeInTheDocument()
      expect(screen.getByText('Check Out from Gig')).toBeInTheDocument()
    })
  })

  it('should show safety check reminder when needed', async () => {
    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: true,
      checkInAt: new Date('2025-01-01T08:00:00Z'),
      lastSafetyCheckAt: new Date('2025-01-01T08:00:00Z'),
      missedSafetyChecks: 0,
      needsSafetyCheck: true
    })

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Safety Check Needed')).toBeInTheDocument()
      expect(screen.getByText(/It's been 2\+ hours/)).toBeInTheDocument()
    })
  })

  it('should handle check-in successfully', async () => {
    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: false,
      missedSafetyChecks: 0,
      needsSafetyCheck: false
    })

    ;(GigService.checkIn as jest.Mock).mockResolvedValue(undefined)

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Check In at Gig Location')).toBeInTheDocument()
    })

    const checkInButton = screen.getByText('Check In at Gig Location')
    fireEvent.click(checkInButton)

    await waitFor(() => {
      expect(GigService.checkIn).toHaveBeenCalledWith(
        'app-1',
        'worker-1',
        { latitude: -26.2041, longitude: 28.0473 }
      )
    })
  })

  it('should handle check-out successfully', async () => {
    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: true,
      checkInAt: new Date('2025-01-01T10:00:00Z'),
      missedSafetyChecks: 0,
      needsSafetyCheck: false
    })

    ;(GigService.checkOut as jest.Mock).mockResolvedValue(undefined)

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Check Out from Gig')).toBeInTheDocument()
    })

    const checkOutButton = screen.getByText('Check Out from Gig')
    fireEvent.click(checkOutButton)

    await waitFor(() => {
      expect(GigService.checkOut).toHaveBeenCalledWith(
        'app-1',
        'worker-1',
        { latitude: -26.2041, longitude: 28.0473 }
      )
    })
  })

  it('should handle safety check successfully', async () => {
    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: true,
      checkInAt: new Date('2025-01-01T10:00:00Z'),
      missedSafetyChecks: 0,
      needsSafetyCheck: true
    })

    ;(GigService.performSafetyCheck as jest.Mock).mockResolvedValue(undefined)

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Confirm I\'m Safe ✓')).toBeInTheDocument()
    })

    const safetyCheckButton = screen.getByText('Confirm I\'m Safe ✓')
    fireEvent.click(safetyCheckButton)

    await waitFor(() => {
      expect(GigService.performSafetyCheck).toHaveBeenCalledWith(
        'app-1',
        'worker-1'
      )
    })
  })

  it('should show checked-out status', async () => {
    const checkInTime = new Date('2025-01-01T10:00:00Z')
    const checkOutTime = new Date('2025-01-01T14:00:00Z')

    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: false,
      checkInAt: checkInTime,
      checkOutAt: checkOutTime,
      missedSafetyChecks: 0,
      needsSafetyCheck: false
    })

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Checked Out')).toBeInTheDocument()
    })
  })

  it('should display safety tips', async () => {
    ;(GigService.getCheckInStatus as jest.Mock).mockResolvedValue({
      isCheckedIn: false,
      missedSafetyChecks: 0,
      needsSafetyCheck: false
    })

    render(<GigCheckIn application={mockApplication} />)

    await waitFor(() => {
      expect(screen.getByText('Safety Tips')).toBeInTheDocument()
      expect(screen.getByText(/Check in when you arrive/)).toBeInTheDocument()
      expect(screen.getByText(/Confirm you're safe every 2 hours/)).toBeInTheDocument()
    })
  })
})
