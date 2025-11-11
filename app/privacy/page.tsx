import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy - KasiGig',
  description: 'How KasiGig collects, uses, and protects your personal information'
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-2xl font-bold text-primary-600">KasiGig</span>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: January 2025</p>

          <div className="prose prose-gray max-w-none">
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-secondary-900 mb-2">
                <strong>POPIA Compliance:</strong> This Privacy Policy complies with the Protection of Personal Information Act (POPIA) of South Africa. We are committed to protecting your personal information and privacy rights.
              </p>
              <p className="text-sm text-secondary-700 mb-0">
                See our dedicated <Link href="/popia" className="underline hover:text-secondary-800">POPIA Compliance page</Link> for detailed information about your data rights.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                KasiGig (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.
              </p>
              <p className="text-gray-700">
                By using KasiGig, you consent to the data practices described in this policy. If you do not agree with our policies, please do not use the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">We collect information that identifies you personally, including:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Identity Information:</strong> Full name, South African ID number, date of birth, profile photo</li>
                <li><strong>Contact Information:</strong> Email address, phone number, physical address</li>
                <li><strong>Financial Information:</strong> Bank account details for payments, transaction history</li>
                <li><strong>Verification Documents:</strong> Copies of ID documents, business registration documents</li>
                <li><strong>Profile Information:</strong> Skills, work history, reviews, ratings, portfolio</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Usage Information</h3>
              <p className="text-gray-700 mb-4">We automatically collect information about your use of the Platform:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Location data (GPS coordinates when you enable location services)</li>
                <li>Activity logs (pages visited, features used, search queries)</li>
                <li>Communication records (messages between users, support interactions)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Cookies and Tracking</h3>
              <p className="text-gray-700">
                We use cookies, web beacons, and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your personal information for the following purposes:</p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Platform Services</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Create and manage your account</li>
                <li>Verify your identity and credentials</li>
                <li>Match Workers with Employers</li>
                <li>Process payments and maintain financial records</li>
                <li>Enable communication between users</li>
                <li>Provide customer support</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Safety and Security</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Verify user identities and prevent fraud</li>
                <li>Monitor for suspicious activity</li>
                <li>Enforce our Terms of Service</li>
                <li>Resolve disputes and investigations</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Platform Improvement</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Analyze usage patterns and trends</li>
                <li>Improve features and functionality</li>
                <li>Personalize your experience</li>
                <li>Conduct research and development</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.4 Marketing and Communication</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Send service notifications and updates</li>
                <li>Notify you of relevant Gig opportunities</li>
                <li>Share promotional offers (with your consent)</li>
                <li>Conduct surveys and feedback requests</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 With Other Users</h3>
              <p className="text-gray-700 mb-4">
                When you apply for or post Gigs, relevant profile information is shared with the other party. Workers can see Employer profiles; Employers can see Worker profiles, skills, and reviews.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We share information with trusted third-party service providers who assist with:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Payment processing (banks, payment gateways)</li>
                <li>Identity verification services</li>
                <li>Cloud hosting and data storage</li>
                <li>Customer support tools</li>
                <li>Analytics and marketing platforms</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information when required by law or to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Comply with legal process or government requests</li>
                <li>Protect the rights, property, or safety of KasiGig, users, or others</li>
                <li>Enforce our Terms of Service</li>
                <li>Investigate fraud or security issues</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.4 Business Transfers</h3>
              <p className="text-gray-700">
                If KasiGig is involved in a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your information becomes subject to a different privacy policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and monitoring</li>
                <li>Employee training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
              <p className="text-gray-700">
                While we strive to protect your information, no security system is impenetrable. Please report any suspected security breaches immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights Under POPIA</h2>
              <p className="text-gray-700 mb-4">
                As a South African data subject, you have the following rights:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your information (subject to legal obligations)</li>
                <li><strong>Objection:</strong> Object to certain processing of your data</li>
                <li><strong>Portability:</strong> Request your data in a structured format</li>
                <li><strong>Restriction:</strong> Request limitation on how we use your data</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for marketing communications</li>
              </ul>
              <p className="text-gray-700">
                To exercise these rights, contact our Information Officer at <a href="mailto:privacy@kasigig.co.za" className="text-primary-600 hover:underline">privacy@kasigig.co.za</a>. See our <Link href="/popia" className="text-primary-600 hover:underline">POPIA Compliance page</Link> for detailed procedures.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Provide our services and maintain your account</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Prevent fraud and abuse</li>
              </ul>
              <p className="text-gray-700">
                When you close your account, we will delete or anonymize your information within 90 days, except where retention is required by law or for legitimate business purposes (e.g., financial records, dispute resolution).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-gray-700">
                KasiGig is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information is primarily stored and processed in South Africa. If we transfer data internationally, we ensure adequate safeguards are in place as required by POPIA.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy periodically. Material changes will be notified via email or Platform notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                For privacy-related questions or to exercise your rights:
              </p>
              <p className="text-gray-700">
                <strong>Information Officer:</strong> [Name]<br />
                <strong>Email:</strong> <a href="mailto:privacy@kasigig.co.za" className="text-primary-600 hover:underline">privacy@kasigig.co.za</a><br />
                <strong>Address:</strong> [Your Business Address], South Africa<br />
                <strong>Information Regulator:</strong> If you are not satisfied with our response, you may lodge a complaint with the Information Regulator at <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">inforegulator.org.za</a>
              </p>
            </section>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Acknowledgment:</strong> By using KasiGig, you acknowledge that you have read and understood this Privacy Policy.
              </p>
              <p className="text-sm text-gray-600">
                Version 1.0 | Effective January 2025 | POPIA Compliant
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
