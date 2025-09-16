import React from 'react'
import { Link } from 'react-router-dom'

const AccountDeletion = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Deletion</h1>
          <p className="text-sm text-gray-400 mt-1">Request deletion of your account and personal data</p>
        </header>

        <div className="space-y-6 bg-gray-800/60 rounded-2xl p-6 border border-gray-700/50">
          <p>
            You can permanently delete your account and associated personal data from our systems. This action is irreversible. Once we process your request, you will lose access to bookings, vouchers, and saved preferences.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">How to Request Deletion</h2>
            <ol className="list-decimal pl-5 space-y-2 text-gray-300">
              <li>Make sure you are signed in to the account you wish to delete.</li>
              <li>Send an email to <span className="text-orange-400">privacy@tpx-barbershop.example</span> with the subject "Account Deletion Request".</li>
              <li>Include your registered email address and a brief confirmation that you want the account deleted.</li>
            </ol>
            <p className="mt-3 text-gray-400 text-sm">We will verify your identity and process deletion within 7–14 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">What Will Be Deleted</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Profile data (name, email, phone, avatar).</li>
              <li>Authentication tokens and sessions.</li>
              <li>Booking history and voucher associations, where applicable.</li>
            </ul>
            <p className="text-gray-400 text-sm mt-2">Certain records may be retained as required by law (e.g., financial records).</p>
          </section>
        </div>

        <div className="mt-8">
          <Link to="/" className="text-orange-400 hover:text-orange-300">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}

export default AccountDeletion


