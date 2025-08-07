import { Link } from 'react-router-dom'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

function CustomerDashboard() {
  const mockData = {
    user: {
      name: 'John Doe',
      points: 250,
      totalVisits: 12
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
    <div className="min-h-screen bg-gray-light">
      {/* Header */}
      <header className="bg-primary-black text-white">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold">Welcome back, {mockData.user.name}!</h1>
          <p className="text-gray-300 mt-1">Manage your appointments and rewards</p>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Points Card */}
        <Card className="bg-gradient-to-r from-primary-orange to-orange-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">{mockData.user.points}</h2>
              <p className="text-orange-100">Loyalty Points</p>
              <p className="text-orange-200 text-sm mt-1">{mockData.user.totalVisits} total visits</p>
            </div>
            <div className="text-6xl opacity-30">⭐</div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/customer/booking">
            <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-3xl mb-2">📅</div>
              <h3 className="font-semibold text-primary-black">Book Now</h3>
              <p className="text-gray-dark text-sm">Schedule appointment</p>
            </Card>
          </Link>
          
          <Card className="text-center">
            <div className="text-3xl mb-2">🎟️</div>
            <h3 className="font-semibold text-primary-black">My Vouchers</h3>
            <p className="text-gray-dark text-sm">{mockData.vouchers.length} active</p>
          </Card>
        </div>

        {/* Active Vouchers */}
        <div>
          <h3 className="text-lg font-semibold text-primary-black mb-3">Active Vouchers</h3>
          <div className="space-y-3">
            {mockData.vouchers.map((voucher) => (
              <Card key={voucher.id} className="border-l-4 border-l-primary-orange">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-primary-black">{voucher.code}</h4>
                    <p className="text-primary-orange font-semibold">{voucher.value} off</p>
                    <p className="text-gray-dark text-sm">Expires: {voucher.expires}</p>
                  </div>
                  <Button variant="outline" className="min-h-[36px] w-auto px-4 text-sm">
                    Use Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div>
          <h3 className="text-lg font-semibold text-primary-black mb-3">Upcoming Appointments</h3>
          {mockData.upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {mockData.upcomingBookings.map((booking) => (
                <Card key={booking.id} className="border-l-4 border-l-green-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-primary-black">{booking.service}</h4>
                      <p className="text-gray-dark">{booking.date} at {booking.time}</p>
                      <p className="text-gray-dark text-sm">with {booking.staff}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="min-h-[32px] w-auto px-3 text-xs">
                        Reschedule
                      </Button>
                      <Button variant="secondary" className="min-h-[32px] w-auto px-3 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-dark mb-4">No upcoming appointments</p>
              <Link to="/customer/booking">
                <Button className="w-auto px-6">Book Appointment</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Recent History */}
        <div>
          <h3 className="text-lg font-semibold text-primary-black mb-3">Recent History</h3>
          <div className="space-y-3">
            {mockData.recentBookings.map((booking) => (
              <Card key={booking.id} className="opacity-75">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-primary-black">{booking.service}</h4>
                    <p className="text-gray-dark">{booking.date} with {booking.staff}</p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">
                    {booking.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex justify-around py-3">
          <Link to="/customer/dashboard" className="text-primary-orange flex flex-col items-center">
            <span className="text-xl">🏠</span>
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/customer/booking" className="text-gray-dark flex flex-col items-center">
            <span className="text-xl">📅</span>
            <span className="text-xs">Book</span>
          </Link>
          <div className="text-gray-dark flex flex-col items-center">
            <span className="text-xl">⭐</span>
            <span className="text-xs">Rewards</span>
          </div>
          <div className="text-gray-dark flex flex-col items-center">
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