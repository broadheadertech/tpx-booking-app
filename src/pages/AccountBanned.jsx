import { ShieldX } from 'lucide-react'

export default function AccountBanned() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white">Account Suspended</h1>
        <p className="text-gray-400 leading-relaxed">
          Your account has been suspended by an administrator.
          If you believe this is an error, please contact support.
        </p>
        <div className="pt-4">
          <a
            href="/auth/login"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Return to login
          </a>
        </div>
      </div>
    </div>
  )
}
