import { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service - MzansiGig',
  description: 'Terms and conditions for using MzansiGig platform'
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-2xl font-bold text-primary-600">MzansiGig</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-secondary-600 hover:text-secondary-700 transition-colors font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: January 2025</p>

          <div className="prose prose-gray max-w-none">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-amber-900 mb-0">
                <strong>Legal Notice:</strong> These terms are provided as a template and should be reviewed by a qualified South African attorney before use. MzansiGig is subject to South African law.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using MzansiGig (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform.
              </p>
              <p className="text-gray-700">
                MzansiGig is a South African platform connecting job seekers with employers for short-term work opportunities (&quot;Gigs&quot;). These terms govern your use of our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
              <p className="text-gray-700 mb-4">To use MzansiGig, you must:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Be at least 18 years old</li>
                <li>Be a South African citizen or have legal right to work in South Africa</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable South African laws and regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Account Types</h3>
              <p className="text-gray-700 mb-4">
                MzansiGig offers two account types: Job Seekers (Workers) and Employers. You may create one account per type.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Verification</h3>
              <p className="text-gray-700 mb-4">
                Users must complete identity verification using their South African ID document. Employers must provide additional business verification. We reserve the right to verify information and suspend accounts that fail verification.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Account Security</h3>
              <p className="text-gray-700">
                You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account. Notify us immediately of any unauthorized use.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Services and Fees</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Platform Services</h3>
              <p className="text-gray-700 mb-4">
                MzansiGig provides a marketplace for posting, finding, and completing Gigs. We facilitate payments through our escrow system but are not party to the employment relationship between Workers and Employers.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Service Fees</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Workers: We charge a service fee on completed Gigs (percentage disclosed at booking)</li>
                <li>Employers: Platform fees apply when posting Gigs (disclosed before posting)</li>
                <li>Payment Processing: Transaction fees may apply for withdrawals</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Payments and Escrow</h3>
              <p className="text-gray-700">
                All Gig payments are held in escrow until work is completed and approved. Employers must fund Gigs before Workers begin. Workers receive payment within 24-48 hours of approval.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. User Conduct</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Prohibited Activities</h3>
              <p className="text-gray-700 mb-4">You may not:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Post false, misleading, or fraudulent Gigs or profiles</li>
                <li>Discriminate based on race, gender, age, religion, or other protected characteristics</li>
                <li>Circumvent the Platform to avoid fees</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Post content that violates South African law</li>
                <li>Use automated tools to scrape or collect data from the Platform</li>
                <li>Attempt to gain unauthorized access to Platform systems</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.2 Content Standards</h3>
              <p className="text-gray-700">
                All Gig postings, profiles, and communications must be professional, accurate, and compliant with South African employment and advertising laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Gig Relationships</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Independent Contractors</h3>
              <p className="text-gray-700 mb-4">
                Workers are independent contractors, not employees of MzansiGig or the Employers. The Platform facilitates connections but does not create employment relationships.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Compliance</h3>
              <p className="text-gray-700">
                Users must comply with all applicable South African laws including but not limited to: Employment Equity Act, Basic Conditions of Employment Act, Labour Relations Act, and tax obligations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Dispute Resolution</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.1 Platform Mediation</h3>
              <p className="text-gray-700 mb-4">
                In the event of disputes between Workers and Employers, MzansiGig will attempt to mediate. Our decision regarding escrow release is final but does not prevent parties from seeking legal remedies.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.2 Governing Law</h3>
              <p className="text-gray-700">
                These Terms are governed by the laws of the Republic of South Africa. Disputes will be resolved in South African courts with jurisdiction in Gauteng Province.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                MzansiGig provides a platform for connecting users but does not guarantee the quality, safety, legality, or accuracy of Gigs or users. To the maximum extent permitted by South African law:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>We are not liable for disputes between Workers and Employers</li>
                <li>We do not guarantee Platform availability or error-free operation</li>
                <li>Our total liability is limited to fees paid in the 12 months preceding the claim</li>
                <li>We are not responsible for third-party actions or content</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or for any reason at our discretion. You may close your account at any time, subject to completing outstanding obligations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700">
                We may modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance. Material changes will be communicated via email or Platform notification.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-2">
                For questions about these Terms, contact us at:
              </p>
              <p className="text-gray-700">
                Email: legal@mzansigig.co.za<br />
                Physical Address: MzansiGig (Pty) Ltd, Johannesburg, South Africa<br />
                Postal Address: P.O. Box 12345, Johannesburg, 2000, South Africa
              </p>
            </section>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Acknowledgment:</strong> By using MzansiGig, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <p className="text-sm text-gray-600">
                Version 1.0 | Effective January 2025
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>

      <Footer />
    </div>
  )
}
