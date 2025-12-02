import React from 'react'
import { Link } from 'react-router-dom'

const Policy = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mt-1">Effective date: {new Date().toLocaleDateString()}</p>
        </header>

        <div className="space-y-6 bg-gray-800/60 rounded-2xl p-6 border border-gray-700/50">
          <p>
            This Privacy Policy describes how we collect, use, and protect your personal information when you use our services. By using our website and application, you consent to the data practices described in this policy.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Account details such as name, email, and mobile number.</li>
              <li>Booking information and transaction history.</li>
              <li>Authentication data from third parties when you choose social login (e.g., Facebook name and profile image URL).</li>
              <li>Technical data for security and analytics (IP address, device, and usage).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Provide and improve booking and account features.</li>
              <li>Send service notifications, booking confirmations, and updates.</li>
              <li>Maintain platform security and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Data Sharing</h2>
            <p>
              We do not sell your personal data. We may share limited data with processors (e.g., payment, analytics, hosting) under strict agreements and only as necessary to operate the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Access, update, or correct your information.</li>
              <li>Request deletion of your account and associated personal data.</li>
              <li>Withdraw consent for optional processing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
            <p>
              For privacy requests, contact us at <span className="text-orange-400">fcvndo@fcv.com</span> or visit the
              {' '}<Link to="/account-deletion" className="text-orange-400 hover:text-orange-300">Account Deletion</Link>{' '}page.
            </p>
          </section>
        </div>

        <div className="mt-8">
          <Link to="/" className="text-orange-400 hover:text-orange-300">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}

export default Policy


