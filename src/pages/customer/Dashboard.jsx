import { Link } from 'react-router-dom'
import { Scissors, Gift, Calendar, Clock, User, Home, BookOpen, Award, Settings, Bell, Search, Star, MapPin } from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

function CustomerDashboard() {
  const mockData = {
    user: {
      name: 'John Doe',
      points: 250,
      totalVisits: 12,
      avatar: 'JD'
    },
    vouchers: [
      { id: 1, code: 'SAVE20', value: '$20', expires: '2024-12-31' },
      { id: 2, code: 'FIRST10', value: '$10', expires: '2024-11-15' }
    ],
    upcomingBookings: [
      { id: 1, service: 'Haircut', date: '2024-08-10', time: '2:00 PM', staff: 'Mike' },
      { id: 2, service: 'Beard Trim', date: '2024-08-15', time: '10:30 AM', staff: 'Sarah' }
    ],
    recentBookings: [
      { id: 3, service: 'Haircut & Wash', date: '2024-07-25', staff: 'Mike', status: 'completed' },
      { id: 4, service: 'Beard Trim', date: '2024-07-10', staff: 'Sarah', status: 'completed' }
    ]
  }

  return (
    <div className="min-h-screen bg-accent-cream-light">
      {/* Status Bar Spacer */}
      <div className="h-12 bg-white"></div>
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-medium/30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-orange rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">{mockData.user.avatar}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary-black">Good morning</h1>
                <p className="text-sm text-gray-dark">{mockData.user.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-light rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-dark" />
              </div>
              <div className="w-10 h-10 bg-gray-light rounded-xl flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-gray-dark" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-orange rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary-orange to-accent-coral rounded-3xl p-8 shadow-lg">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You have</h2>
            <p className="text-4xl font-black mb-2">{mockData.user.points}</p>
            <p className="text-white/90 text-lg">Loyalty Points</p>
            <div className="mt-6">
              <div className="bg-white/20 rounded-2xl px-4 py-2 inline-block">
                <p className="text-white/90 text-sm">🎁 Redeem rewards starting at 100 points</p>
              </div>
            </div>
          </div>
        </div>

        {/* What would you like to do? */}
        <div>
          <h2 className="text-xl font-bold text-primary-black mb-6 text-center">What would you like to do?</h2>
          <div className="grid grid-cols-2 gap-6">
            <Link to="/customer/booking">
              <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-medium/20 hover:border-primary-orange/30">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary-orange rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-primary-black mb-2 text-lg">Book Service</h3>
                  <p className="text-gray-dark text-sm">Schedule appointment</p>
                </div>
              </div>
            </Link>
            
            <Link to="/customer/vouchers">
              <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-medium/20 hover:border-accent-coral/30">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-accent-coral rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-primary-black mb-2 text-lg">Vouchers</h3>
                  <p className="text-gray-dark text-sm">View & redeem</p>
                </div>
              </div>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-6">
            <Link to="/customer/bookings">
              <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-medium/20 hover:border-primary-orange/30">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary-orange/10 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-primary-orange" />
                  </div>
                  <h3 className="font-bold text-primary-black mb-2 text-lg">My Bookings</h3>
                  <p className="text-gray-dark text-sm">View appointments</p>
                </div>
              </div>
            </Link>
            
            <Link to="/customer/profile">
              <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-medium/20 hover:border-primary-orange/30">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary-orange/10 rounded-2xl flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-primary-orange" />
                  </div>
                  <h3 className="font-bold text-primary-black mb-2 text-lg">Profile</h3>
                  <p className="text-gray-dark text-sm">Account settings</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Active Vouchers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary-black">Your Vouchers</h3>
            <span className="bg-accent-coral/10 text-accent-coral px-3 py-1 rounded-full text-sm font-semibold">
              {mockData.vouchers.length} Active
            </span>
          </div>
          <div className="bg-gradient-to-r from-accent-coral/10 to-primary-orange/10 rounded-3xl p-6">
            <div className="grid gap-4">
              {mockData.vouchers.map((voucher) => (
                <div key={voucher.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-medium/20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-accent-coral/10 rounded-xl flex items-center justify-center">
                        <Gift className="w-6 h-6 text-accent-coral" />
                      </div>
                      <div>
                        <h4 className="font-bold text-primary-black">{voucher.code}</h4>
                        <p className="text-accent-coral font-bold text-lg">{voucher.value} OFF</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="outline" className="min-h-[36px] w-auto px-4 text-sm border-accent-coral text-accent-coral hover:bg-accent-coral hover:text-white">
                        Use Now
                      </Button>
                      <p className="text-gray-dark text-xs mt-1">Expires {voucher.expires}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>



        {/* Recent Visits */}
        <div>
          <h3 className="text-lg font-bold text-primary-black mb-4">Recent Visits</h3>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-medium/20">
            <div className="space-y-4">
              {mockData.recentBookings.map((booking, index) => (
                <div key={booking.id} className={`flex justify-between items-center ${index !== mockData.recentBookings.length - 1 ? 'pb-4 border-b border-gray-medium/20' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-orange/10 rounded-xl flex items-center justify-center">
                      <Scissors className="w-5 h-5 text-primary-orange" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary-black">{booking.service}</h4>
                      <p className="text-gray-dark text-sm">{booking.date} • {booking.staff}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                      ✓ Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/customer/history" className="text-primary-orange font-semibold text-sm hover:text-primary-orange-dark transition-colors">
                View All History →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-medium shadow-lg">
        <div className="flex justify-around py-3">
          <Link to="/customer/dashboard" className="text-primary-orange flex flex-col items-center">
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link to="/customer/booking" className="text-gray-dark hover:text-primary-orange transition-colors flex flex-col items-center">
            <span className="text-xl">📅</span>
            <span className="text-xs">Book</span>
          </Link>
          <div className="text-gray-dark hover:text-primary-orange transition-colors flex flex-col items-center cursor-pointer">
            <span className="text-xl">⭐</span>
            <span className="text-xs">Rewards</span>
          </div>
          <div className="text-gray-dark hover:text-primary-orange transition-colors flex flex-col items-center cursor-pointer">
            <span className="text-xl">👤</span>
            <span className="text-xs">Profile</span>
          </div>
        </div>
      </div>

      {/* Add padding to prevent bottom nav overlap */}
      <div className="h-20"></div>
    </div>
  )
}

export default CustomerDashboard