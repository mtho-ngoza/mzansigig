import React from 'react'
import { render, screen } from '@testing-library/react'
import TermsOfService from '@/app/terms/page'
import PrivacyPolicy from '@/app/privacy/page'
import POPIACompliance from '@/app/popia/page'

// Mock the Footer component
jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer Content</footer>
}))

describe('Legal Pages - Footer Presence', () => {
  describe('Terms of Service Page', () => {
    it('should render the terms page content', () => {
      render(<TermsOfService />)

      expect(screen.getByText('Terms of Service')).toBeInTheDocument()
    })

    it('should include the Footer component', () => {
      render(<TermsOfService />)

      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('should have navigation header with back button', () => {
      render(<TermsOfService />)

      expect(screen.getByText('Back to Home')).toBeInTheDocument()
      expect(screen.getByText('MzansiGig')).toBeInTheDocument()
    })

    it('should have legal notice disclaimer', () => {
      render(<TermsOfService />)

      expect(screen.getByText(/Legal Notice/)).toBeInTheDocument()
      expect(screen.getByText(/should be reviewed by a qualified South African attorney/)).toBeInTheDocument()
    })

    it('should have last updated date', () => {
      render(<TermsOfService />)

      expect(screen.getByText(/Last Updated: January 2025/)).toBeInTheDocument()
    })

    it('should have contact email', () => {
      render(<TermsOfService />)

      expect(screen.getByText(/legal@mzansigig.co.za/)).toBeInTheDocument()
    })

    it('should have version information', () => {
      render(<TermsOfService />)

      expect(screen.getByText(/Version 1.0/)).toBeInTheDocument()
    })
  })

  describe('Privacy Policy Page', () => {
    it('should render the privacy policy content', () => {
      render(<PrivacyPolicy />)

      expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    })

    it('should include the Footer component', () => {
      render(<PrivacyPolicy />)

      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('should have navigation header with back button', () => {
      render(<PrivacyPolicy />)

      expect(screen.getByText('Back to Home')).toBeInTheDocument()
      expect(screen.getByText('MzansiGig')).toBeInTheDocument()
    })

    it('should have POPIA compliance notice', () => {
      render(<PrivacyPolicy />)

      expect(screen.getAllByText(/POPIA Compliance/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Protection of Personal Information Act/).length).toBeGreaterThan(0)
    })

    it('should have link to POPIA compliance page', () => {
      render(<PrivacyPolicy />)

      const popiaLinks = screen.getAllByRole('link', { name: /POPIA Compliance page/i })
      expect(popiaLinks.length).toBeGreaterThan(0)
      expect(popiaLinks[0]).toHaveAttribute('href', '/popia')
    })

    it('should have contact email', () => {
      render(<PrivacyPolicy />)

      expect(screen.getAllByText(/privacy@mzansigig.co.za/).length).toBeGreaterThan(0)
    })

    it('should have POPIA compliant label', () => {
      render(<PrivacyPolicy />)

      expect(screen.getByText(/POPIA Compliant/)).toBeInTheDocument()
    })
  })

  describe('POPIA Compliance Page', () => {
    it('should render the POPIA compliance content', () => {
      render(<POPIACompliance />)

      expect(screen.getByText('POPIA Compliance')).toBeInTheDocument()
    })

    it('should include the Footer component', () => {
      render(<POPIACompliance />)

      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('should have navigation header with back button', () => {
      render(<POPIACompliance />)

      expect(screen.getByText('Back to Home')).toBeInTheDocument()
      expect(screen.getByText('MzansiGig')).toBeInTheDocument()
    })

    it('should explain POPIA protection', () => {
      render(<POPIACompliance />)

      expect(screen.getByText(/We Protect Your Privacy/)).toBeInTheDocument()
      expect(screen.getAllByText(/Protection of Personal Information Act \(POPIA\)/).length).toBeGreaterThan(0)
    })

    it('should list all 8 POPIA rights', () => {
      render(<POPIACompliance />)

      expect(screen.getByText(/Right to Access/)).toBeInTheDocument()
      expect(screen.getByText(/Right to Correction/)).toBeInTheDocument()
      expect(screen.getByText(/Right to Deletion/)).toBeInTheDocument()
      expect(screen.getByText(/Right to Object/)).toBeInTheDocument()
      expect(screen.getByText(/Right to Data Portability/)).toBeInTheDocument()
      expect(screen.getByText(/Right to Restrict Processing/)).toBeInTheDocument()
      expect(screen.getByText(/Right to Withdraw Consent/)).toBeInTheDocument()
      expect(screen.getByText(/Right to Lodge a Complaint/)).toBeInTheDocument()
    })

    it('should have Information Regulator contact details', () => {
      render(<POPIACompliance />)

      expect(screen.getByText(/Information Regulator \(South Africa\)/)).toBeInTheDocument()
      expect(screen.getByText(/inforegulator.org.za/)).toBeInTheDocument()
    })

    it('should have request process steps', () => {
      render(<POPIACompliance />)

      expect(screen.getByText(/Submit Your Request/)).toBeInTheDocument()
      expect(screen.getByText(/Identity Verification/)).toBeInTheDocument()
      expect(screen.getByText(/Processing Time/)).toBeInTheDocument()
    })

    it('should have privacy contact email', () => {
      render(<POPIACompliance />)

      expect(screen.getAllByText(/privacy@mzansigig.co.za/).length).toBeGreaterThan(0)
    })

    it('should have data categories grid', () => {
      render(<POPIACompliance />)

      expect(screen.getByText(/What Information We Process/)).toBeInTheDocument()
      expect(screen.getByText(/Identity Data/)).toBeInTheDocument()
      expect(screen.getByText(/Financial Data/)).toBeInTheDocument()
    })
  })

  describe('Cross-Page Consistency', () => {
    it('should have consistent navigation header across all legal pages', () => {
      const { unmount: unmountTerms } = render(<TermsOfService />)
      expect(screen.getByText('MzansiGig')).toBeInTheDocument()
      expect(screen.getByText('Back to Home')).toBeInTheDocument()
      unmountTerms()

      const { unmount: unmountPrivacy } = render(<PrivacyPolicy />)
      expect(screen.getByText('MzansiGig')).toBeInTheDocument()
      expect(screen.getByText('Back to Home')).toBeInTheDocument()
      unmountPrivacy()

      render(<POPIACompliance />)
      expect(screen.getByText('MzansiGig')).toBeInTheDocument()
      expect(screen.getByText('Back to Home')).toBeInTheDocument()
    })

    it('should have Footer on all legal pages', () => {
      const { unmount: unmountTerms } = render(<TermsOfService />)
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      unmountTerms()

      const { unmount: unmountPrivacy } = render(<PrivacyPolicy />)
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      unmountPrivacy()

      render(<POPIACompliance />)
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('should have contact email on all legal pages', () => {
      const { unmount: unmountTerms } = render(<TermsOfService />)
      expect(screen.getAllByText(/mzansigig.co.za/).length).toBeGreaterThan(0)
      unmountTerms()

      const { unmount: unmountPrivacy } = render(<PrivacyPolicy />)
      expect(screen.getAllByText(/mzansigig.co.za/).length).toBeGreaterThan(0)
      unmountPrivacy()

      render(<POPIACompliance />)
      expect(screen.getAllByText(/mzansigig.co.za/).length).toBeGreaterThan(0)
    })
  })

  describe('Navigation Links', () => {
    it('should have working home link in Terms header', () => {
      render(<TermsOfService />)

      const homeLinks = screen.getAllByRole('link')
      const mzansigigLink = homeLinks.find(link => link.textContent === 'MzansiGig')
      expect(mzansigigLink).toHaveAttribute('href', '/')
    })

    it('should have working home link in Privacy header', () => {
      render(<PrivacyPolicy />)

      const homeLinks = screen.getAllByRole('link')
      const mzansigigLink = homeLinks.find(link => link.textContent === 'MzansiGig')
      expect(mzansigigLink).toHaveAttribute('href', '/')
    })

    it('should have working home link in POPIA header', () => {
      render(<POPIACompliance />)

      const homeLinks = screen.getAllByRole('link')
      const mzansigigLink = homeLinks.find(link => link.textContent === 'MzansiGig')
      expect(mzansigigLink).toHaveAttribute('href', '/')
    })
  })
})
