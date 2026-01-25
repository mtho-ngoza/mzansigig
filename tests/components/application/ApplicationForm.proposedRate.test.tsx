import React from 'react'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import ApplicationForm from '@/components/application/ApplicationForm'
import { Gig } from '@/types/gig'

// Mock Next.js heavy modules to lightweight stubs
jest.mock('next/image', () => (props: any) => <img {...props} />)
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: { on: jest.fn(), off: jest.fn() }
  })
}))

// Mock UI primitives to simple pass-throughs
jest.mock('@/components/ui/Input', () => ({
  Input: (props: any) => {
    const { isLoading, loading, variant, size, leftIcon, rightIcon, isloading, ...rest } = props || {};
    return <input {...rest} />;
  }
}))
jest.mock('@/components/ui/Button', () => ({
  Button: (props: any) => {
    const { isLoading, loading, variant, size, leftIcon, rightIcon, isloading, ...rest } = props || {};
    return <button {...rest} />;
  }
}))
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}))

// Mock contexts
const mockCalculateGigFees = jest.fn()
jest.mock('@/contexts/PaymentContext', () => ({
  usePayment: () => ({ calculateGigFees: mockCalculateGigFees })
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'worker-1', firstName: 'Test', lastName: 'User' } })
}))

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() })
}))

// Avoid any calls that might hit Firestore via GigService on submit
jest.mock('@/lib/database/gigService', () => ({
  GigService: {
    hasUserApplied: jest.fn().mockResolvedValue(false),
    createApplication: jest.fn().mockResolvedValue('new-app')
  }
}))

// Mock currency/amount display to avoid depending on formatCurrency implementation
jest.mock('@/components/gig/GigAmountDisplay', () => {
  const StubDefault = ({ budget, className }: any) => <div className={className}>{budget}</div>;
  const WorkerEarningsDisplay = ({ feeBreakdown, className }: any) => (
    <div className={className}>{feeBreakdown?.netAmountToWorker ?? ''}</div>
  );
  return {
    __esModule: true,
    default: StubDefault,
    WorkerEarningsDisplay
  };
});

function makeGig(overrides: Partial<Gig> = {}): Gig {
  return {
    id: 'gig-1',
    title: 'Test Gig',
    description: 'A mock gig for testing',
    category: 'Construction',
    location: 'Cape Town',
    coordinates: undefined,
    budget: 1200,
    duration: '1 week',
    skillsRequired: [],
    employerId: 'emp-1',
    employerName: 'Emp',
    status: 'open',
    applicants: [],
    assignedTo: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: undefined,
    workType: 'physical',
    maxTravelDistance: undefined,
    maxApplicants: undefined,
    ...overrides,
  }
}

describe('ApplicationForm - Proposed Rate stability', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })
  afterAll(() => {
    jest.useRealTimers()
  })
  afterEach(() => {
    cleanup()
    jest.clearAllMocks()
  })

  beforeEach(() => {
    // Provide a safe default for any unexpected fee calculations
    mockCalculateGigFees.mockResolvedValue({ netAmountToWorker: 0 })
  })

  it("does not overwrite user's typed proposedRate when fee calc resolves later", async () => {
    const gig = makeGig({ budget: 1500 })

    // Make fee calculation async and resolve to a different net amount
    mockCalculateGigFees.mockResolvedValueOnce({ netAmountToWorker: 1234 })

    render(<ApplicationForm gig={gig} />)

    const input = screen.getByLabelText(/Your Proposed Rate/i) as HTMLInputElement

    // Initially set to gig budget (from gig change effect)
    expect(input.value).toBe('1500')

    // User starts typing before fees resolve
    fireEvent.change(input, { target: { value: '1600' } })
    expect(input.value).toBe('1600')

    // Wait for the async fee calculation to settle
    await act(async () => {
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })

    // Value should remain user's edit, not overwritten by 1234
    expect(input.value).toBe('1600')
  })

  // it('resets prefill guards on gig change and still respects subsequent user edits', async () => {
  //   const { rerender } = render(<ApplicationForm gig={makeGig({ id: 'gig-a', budget: 1000 })} />)
  //
  //   const input = screen.getByLabelText(/Your Proposed Rate/i) as HTMLInputElement
  //
  //   // First render default to budget
  //   expect(input.value).toBe('1000')
  //
  //   // Fee calc returns 800 net and should prefill once (no user edit yet)
  //   mockCalculateGigFees.mockResolvedValueOnce({ netAmountToWorker: 800 })
  //   await act(async () => {
  //     jest.runOnlyPendingTimers()
  //     await Promise.resolve()
  //   })
  //
  //   // After first calculation, form may set to net 800
  //   // Note: The prefill is conditional and may or may not have happened before this await depending on effect timing,
  //   // assert one of the acceptable defaults
  //   expect(['1000', '800']).toContain(input.value)
  //
  //   // Now user edits to 900
  //   fireEvent.change(input, { target: { value: '900' } })
  //   expect(input.value).toBe('900')
  //
  //   // Trigger another calculation (new gig)
  //   const newGig = makeGig({ id: 'gig-b', budget: 2000 })
  //   mockCalculateGigFees.mockResolvedValueOnce({ netAmountToWorker: 1800 })
  //   rerender(<ApplicationForm gig={newGig} />)
  //
  //   // On gig change, input immediately resets to new budget
  //   expect(input.value).toBe('2000')
  //
  //   // Let async calc resolve; since user hasn't edited after gig change, it may prefill once to net 1800
  //   await act(async () => {
  //     jest.runOnlyPendingTimers()
  //     await Promise.resolve()
  //   })
  //
  //   expect(['2000', '1800']).toContain(input.value)
  //
  //   // After this, simulate another late calc and ensure it does not override after user edits
  //   // User edits again
  //   fireEvent.change(input, { target: { value: '1900' } })
  //   expect(input.value).toBe('1900')
  //
  //   // Another calculation resolves later
  //   mockCalculateGigFees.mockResolvedValueOnce({ netAmountToWorker: 1700 })
  //   await act(async () => {
  //     jest.runOnlyPendingTimers()
  //     await Promise.resolve()
  //   })
  //
  //   // Value should remain user's last edit
  //   expect(input.value).toBe('1900')
  // })
})
