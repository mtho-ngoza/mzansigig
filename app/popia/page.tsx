import { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'POPIA Compliance - MzansiGig',
  description: 'Protection of Personal Information Act (POPIA) compliance and your data rights'
}

export default function POPIACompliance() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">POPIA Compliance</h1>
          <p className="text-lg text-gray-600 mb-8">Protection of Personal Information Act - Your Data Rights</p>

          <div className="prose prose-gray max-w-none">
            <div className="bg-secondary-50 border-l-4 border-secondary-600 p-6 mb-8">
              <h3 className="text-lg font-bold text-secondary-900 mb-2 mt-0">We Protect Your Privacy</h3>
              <p className="text-secondary-800 mb-0">
                MzansiGig is committed to complying with the Protection of Personal Information Act (POPIA), Act 4 of 2013. This page explains your rights and how we protect your personal information.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What is POPIA?</h2>
              <p className="text-gray-700 mb-4">
                The Protection of Personal Information Act (POPIA) is South African legislation that regulates how organizations process personal information. POPIA gives you control over your personal data and holds us accountable for protecting it.
              </p>
              <p className="text-gray-700">
                MzansiGig processes your personal information in accordance with POPIA&apos;s eight conditions for lawful processing: accountability, processing limitation, purpose specification, further processing limitation, information quality, openness, security safeguards, and data subject participation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights Under POPIA</h2>
              <p className="text-gray-700 mb-6">
                As a data subject in South Africa, you have the following rights regarding your personal information:
              </p>

              <div className="space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Right to Access</h3>
                  <p className="text-gray-700 mb-2">You have the right to:</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Know whether we hold your personal information</li>
                    <li>Request a copy of your personal information</li>
                    <li>Receive information about how we use your data</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Right to Correction</h3>
                  <p className="text-gray-700 mb-2">You can:</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Update your personal information if it&apos;s inaccurate or incomplete</li>
                    <li>Request correction of errors in your records</li>
                    <li>Update your profile information at any time through your account settings</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Right to Deletion (Erasure)</h3>
                  <p className="text-gray-700 mb-2">You can request deletion of your personal information when:</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>It&apos;s no longer necessary for the purposes it was collected</li>
                    <li>You withdraw consent (where consent is the basis for processing)</li>
                    <li>You object to processing and there&apos;s no overriding legitimate reason</li>
                    <li>The information was processed unlawfully</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-3">
                    Note: We may retain certain information where required by law or for legitimate purposes (e.g., financial records, dispute resolution).
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Right to Object</h3>
                  <p className="text-gray-700 mb-2">You can object to:</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Processing based on legitimate interests</li>
                    <li>Direct marketing communications (opt-out anytime)</li>
                    <li>Automated decision-making or profiling</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Right to Data Portability</h3>
                  <p className="text-gray-700">
                    Request your personal information in a structured, commonly used, machine-readable format. You can transfer this data to another service provider.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Right to Restrict Processing</h3>
                  <p className="text-gray-700 mb-2">Request that we limit how we use your data when:</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>You contest the accuracy of your data</li>
                    <li>Processing is unlawful but you don&apos;t want data deleted</li>
                    <li>You need the data for legal claims</li>
                    <li>You&apos;ve objected to processing pending verification</li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Right to Withdraw Consent</h3>
                  <p className="text-gray-700">
                    Where we process your data based on consent, you can withdraw that consent at any time. This won&apos;t affect the lawfulness of processing before withdrawal.
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">8. Right to Lodge a Complaint</h3>
                  <p className="text-gray-700">
                    If you&apos;re not satisfied with how we handle your data, you can lodge a complaint with the Information Regulator of South Africa.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Exercise Your Rights</h2>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-primary-900 mb-3">Contact Our Information Officer</h3>
                <p className="text-primary-800 mb-4">
                  To exercise any of your rights, contact our Information Officer:
                </p>
                <div className="text-primary-900">
                  <p className="mb-2"><strong>Information Officer:</strong> Privacy Officer, MzansiGig (Pty) Ltd</p>
                  <p className="mb-2"><strong>Email:</strong> <a href="mailto:privacy@mzansigig.co.za" className="underline hover:text-primary-700">privacy@mzansigig.co.za</a></p>
                  <p className="mb-2"><strong>Phone:</strong> +27 (0) 11 123 4567</p>
                  <p className="mb-2"><strong>Physical Address:</strong> MzansiGig (Pty) Ltd, Johannesburg, South Africa</p>
                  <p className="mb-2"><strong>Postal Address:</strong> P.O. Box 12345, Johannesburg, 2000, South Africa</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Request Process</h3>
              <ol className="list-decimal pl-6 text-gray-700 space-y-3 mb-6">
                <li>
                  <strong>Submit Your Request:</strong> Email our Information Officer with your request. Include your full name, contact details, and description of your request.
                </li>
                <li>
                  <strong>Identity Verification:</strong> We may need to verify your identity to protect your information. Provide a copy of your ID or other identification.
                </li>
                <li>
                  <strong>Processing Time:</strong> We will respond within 30 days of receiving your request. For complex requests, we may extend this to 60 days with notification.
                </li>
                <li>
                  <strong>Response:</strong> We will inform you of actions taken or reasons for any refusal. Most requests are processed free of charge.
                </li>
              </ol>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 mb-0">
                  <strong>Note:</strong> Some requests may be subject to prescribed fees under POPIA regulations. We will inform you of any applicable fees before processing your request.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What Information We Process</h2>
              <p className="text-gray-700 mb-4">We process the following categories of personal information:</p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Identity Data</h4>
                  <p className="text-sm text-gray-700">Name, ID number, date of birth, profile photo</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Data</h4>
                  <p className="text-sm text-gray-700">Email, phone, physical address</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Financial Data</h4>
                  <p className="text-sm text-gray-700">Bank details, payment history, transactions</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Technical Data</h4>
                  <p className="text-sm text-gray-700">IP address, browser, device info, cookies</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Usage Data</h4>
                  <p className="text-sm text-gray-700">Platform activity, search history, preferences</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Profile Data</h4>
                  <p className="text-sm text-gray-700">Skills, work history, reviews, portfolio</p>
                </div>
              </div>

              <p className="text-gray-700">
                For detailed information about how we use this data, see our <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security Measures</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate security measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>End-to-end encryption for sensitive data</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and penetration testing</li>
                <li>Employee training on data protection</li>
                <li>Incident response and breach notification procedures</li>
                <li>Regular backups and disaster recovery plans</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Lodge a Complaint</h2>
              <p className="text-gray-700 mb-4">
                If you believe we have not complied with POPIA or you are dissatisfied with our response to your request, you can lodge a complaint with the Information Regulator:
              </p>

              <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Information Regulator (South Africa)</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Website:</strong> <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">inforegulator.org.za</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> <a href="mailto:inforeg@justice.gov.za" className="text-primary-600 hover:underline">inforeg@justice.gov.za</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Phone:</strong> 012 406 4818
                </p>
                <p className="text-gray-700">
                  <strong>Address:</strong> JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Updates to This Page</h2>
              <p className="text-gray-700">
                We may update this POPIA compliance information from time to time. Check this page regularly for updates. Last updated: January 2025.
              </p>
            </section>

            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-6 mt-8">
              <h3 className="font-bold text-secondary-900 mb-3">Need Help?</h3>
              <p className="text-secondary-800 mb-2">
                If you have questions about POPIA compliance or your data rights, we&apos;re here to help.
              </p>
              <p className="text-secondary-800">
                Contact our Information Officer at <a href="mailto:privacy@mzansigig.co.za" className="underline hover:text-secondary-700">privacy@mzansigig.co.za</a>
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
