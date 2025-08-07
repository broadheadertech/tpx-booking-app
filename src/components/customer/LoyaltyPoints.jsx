import React, { useState } from 'react'
import { ArrowLeft, Star, Gift, Trophy, Crown, Zap, TrendingUp } from 'lucide-react'

const LoyaltyPoints = ({ onBack }) => {
  const [currentPoints] = useState(1250)
  const [lifetimePoints] = useState(3480)
  const [currentTier] = useState('Gold')
  const [nextTier] = useState('Platinum')
  const [pointsToNextTier] = useState(250)

  const pointsHistory = [
    {
      id: 1,
      date: '2024-01-15',
      description: 'Premium Haircut',
      points: 175,
      type: 'earned'
    },
    {
      id: 2,
      date: '2024-01-10',
      description: 'Redeemed Birthday Voucher',
      points: -500,
      type: 'redeemed'
    },
    {
      id: 3,
      date: '2024-01-08',
      description: 'Beard Trim & Style',
      points: 125,
      type: 'earned'
    },
    {
      id: 4,
      date: '2024-01-05',
      description: 'Bonus Points - Referral',
      points: 200,
      type: 'bonus'
    },
    {
      id: 5,
      date: '2024-01-03',
      description: 'Classic Cut',
      points: 100,
      type: 'earned'
    }
  ]

  const rewards = [
    {
      id: 1,
      name: 'Free Basic Haircut',
      pointsCost: 500,
      category: 'Services',
      available: true,
      icon: '✂️',
      description: 'Get a complimentary basic haircut'
    },
    {
      id: 2,
      name: '₱500 Service Voucher',
      pointsCost: 750,
      category: 'Vouchers',
      available: true,
      icon: '🎫',
      description: '₱500 off any service'
    },
    {
      id: 3,
      name: 'Premium Package Discount',
      pointsCost: 1000,
      category: 'Services',
      available: true,
      icon: '⭐',
      description: '50% off complete grooming package'
    },
    {
      id: 4,
      name: 'VIP Priority Booking',
      pointsCost: 300,
      category: 'Perks',
      available: true,
      icon: '👑',
      description: 'Skip the queue with priority booking'
    },
    {
      id: 5,
      name: '₱1,000 Cash Voucher',
      pointsCost: 1500,
      category: 'Vouchers',
      available: false,
      icon: '💰',
      description: '₱1,000 cash voucher - Not enough points'
    },
    {
      id: 6,
      name: 'Platinum Membership',
      pointsCost: 2000,
      category: 'Membership',
      available: false,
      icon: '💎',
      description: 'Upgrade to platinum tier - Not enough points'
    }
  ]

  const tiers = [
    { name: 'Bronze', min: 0, max: 499, color: 'from-amber-600 to-amber-700', icon: '🥉' },
    { name: 'Silver', min: 500, max: 999, color: 'from-gray-400 to-gray-500', icon: '🥈' },
    { name: 'Gold', min: 1000, max: 1499, color: 'from-yellow-400 to-yellow-500', icon: '🥇' },
    { name: 'Platinum', min: 1500, max: 2499, color: 'from-purple-400 to-purple-500', icon: '💎' },
    { name: 'Diamond', min: 2500, max: Infinity, color: 'from-blue-400 to-blue-500', icon: '💠' }
  ]

  const getCurrentTier = () => {
    return tiers.find(tier => currentPoints >= tier.min && currentPoints <= tier.max)
  }

  const getNextTierInfo = () => {
    const currentTierIndex = tiers.findIndex(tier => tier.name === currentTier)
    if (currentTierIndex < tiers.length - 1) {
      return tiers[currentTierIndex + 1]
    }
    return null
  }

  const getProgressPercentage = () => {
    const currentTierInfo = getCurrentTier()
    const nextTierInfo = getNextTierInfo()
    
    if (!nextTierInfo) return 100
    
    const progress = currentPoints - currentTierInfo.min
    const total = nextTierInfo.min - currentTierInfo.min
    
    return (progress / total) * 100
  }

  const handleRedeemReward = (reward) => {
    if (reward.available && currentPoints >= reward.pointsCost) {
      if (window.confirm(`Redeem ${reward.name} for ${reward.pointsCost} points?`)) {
        alert('Reward redeemed successfully! Check your vouchers.')
      }
    }
  }

  const currentTierInfo = getCurrentTier()
  const nextTierInfo = getNextTierInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white py-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-3 text-[#6B6B6B] hover:text-[#FF8C42] font-semibold rounded-2xl hover:bg-white/50 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <div className="text-right">
          <p className="text-sm font-bold text-[#1A1A1A]">Loyalty Rewards</p>
          <p className="text-xs text-[#6B6B6B]">{currentTier} Member</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8 px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <Star className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-[#1A1A1A] mb-2">Loyalty Rewards</h1>
        <p className="text-lg text-[#6B6B6B] font-medium">Earn points, unlock rewards</p>
      </div>

      <div className="space-y-8 px-4">
        {/* Points Balance */}
        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl p-8 shadow-2xl text-white">
          <div className="text-center space-y-4">
            <div className="text-6xl">{currentTierInfo?.icon}</div>
            <div>
              <h2 className="text-2xl font-black mb-2">{currentTier} Member</h2>
              <div className="text-5xl font-black mb-2">{currentPoints.toLocaleString()}</div>
              <p className="text-lg font-medium opacity-90">Available Points</p>
            </div>
            
            {/* Progress to Next Tier */}
            {nextTierInfo && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{pointsToNextTier} points to {nextTier}</span>
                  <span>{Math.round(getProgressPercentage())}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div 
                    className="bg-white rounded-full h-3 transition-all duration-500"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-[#F5F5F5]">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-[#FF8C42] mx-auto mb-3" />
              <div className="text-2xl font-black text-[#1A1A1A] mb-1">{lifetimePoints.toLocaleString()}</div>
              <div className="text-sm font-semibold text-[#6B6B6B]">Lifetime Points</div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-[#F5F5F5]">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <div className="text-2xl font-black text-[#1A1A1A] mb-1">12</div>
              <div className="text-sm font-semibold text-[#6B6B6B]">Services Used</div>
            </div>
          </div>
        </div>

        {/* Available Rewards */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#1A1A1A] flex items-center">
            <Gift className="w-6 h-6 text-[#FF8C42] mr-2" />
            Available Rewards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`bg-white rounded-3xl p-6 shadow-xl border-2 transition-all duration-300 ${
                  reward.available && currentPoints >= reward.pointsCost
                    ? 'border-green-200 hover:shadow-2xl hover:-translate-y-1 cursor-pointer'
                    : reward.available
                    ? 'border-yellow-200 opacity-75'
                    : 'border-gray-200 opacity-50'
                }`}
                onClick={() => handleRedeemReward(reward)}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{reward.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        reward.available && currentPoints >= reward.pointsCost
                          ? 'bg-green-100 text-green-700'
                          : reward.available
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {reward.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-[#1A1A1A] mb-2">{reward.name}</h3>
                    <p className="text-sm text-[#6B6B6B] font-medium mb-3">{reward.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-1">
                        <Star className="w-5 h-5 text-[#FF8C42]" />
                        <span className="text-lg font-black text-[#FF8C42]">
                          {reward.pointsCost.toLocaleString()}
                        </span>
                      </div>
                      {reward.available && currentPoints >= reward.pointsCost && (
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          AVAILABLE
                        </span>
                      )}
                      {reward.available && currentPoints < reward.pointsCost && (
                        <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                          {reward.pointsCost - currentPoints} MORE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Benefits */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#1A1A1A] flex items-center">
            <Crown className="w-6 h-6 text-[#FF8C42] mr-2" />
            Membership Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier, index) => {
              const isCurrentTier = tier.name === currentTier
              const isUnlocked = currentPoints >= tier.min
              
              return (
                <div
                  key={tier.name}
                  className={`bg-gradient-to-br ${tier.color} rounded-3xl p-6 shadow-xl text-white transition-all duration-300 ${
                    isCurrentTier ? 'ring-4 ring-white shadow-2xl scale-105' : ''
                  } ${!isUnlocked ? 'opacity-50' : ''}`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">{tier.icon}</div>
                    <h3 className="text-xl font-black mb-2">{tier.name}</h3>
                    <p className="text-sm font-medium opacity-90 mb-2">
                      {tier.min === 0 ? '0' : tier.min.toLocaleString()}{tier.max === Infinity ? '+' : ` - ${tier.max.toLocaleString()}`} points
                    </p>
                    {isCurrentTier && (
                      <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
                        CURRENT TIER
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Points History */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#1A1A1A] flex items-center">
            <Zap className="w-6 h-6 text-[#FF8C42] mr-2" />
            Recent Activity
          </h2>
          <div className="bg-white rounded-3xl shadow-xl border-2 border-[#F5F5F5] divide-y divide-[#F5F5F5]">
            {pointsHistory.map((entry) => (
              <div key={entry.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    entry.type === 'earned' 
                      ? 'bg-green-100' 
                      : entry.type === 'bonus'
                      ? 'bg-blue-100'
                      : 'bg-red-100'
                  }`}>
                    {entry.type === 'earned' && <Star className="w-6 h-6 text-green-600" />}
                    {entry.type === 'bonus' && <Gift className="w-6 h-6 text-blue-600" />}
                    {entry.type === 'redeemed' && <Zap className="w-6 h-6 text-red-600" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1A1A1A]">{entry.description}</h4>
                    <p className="text-sm text-[#6B6B6B] font-medium">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-black ${
                  entry.points > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {entry.points > 0 ? '+' : ''}{entry.points}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to Earn More Points */}
        <div className="bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-3xl p-8 text-white">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
              <Star className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black mb-2">Earn More Points</h3>
              <p className="text-lg font-medium opacity-90 mb-4">Every ₱1 spent = 1 point earned</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-bold mb-1">• Book Services</div>
                  <div className="opacity-80">Earn 1 point per peso</div>
                </div>
                <div>
                  <div className="font-bold mb-1">• Refer Friends</div>
                  <div className="opacity-80">Get 200 bonus points</div>
                </div>
                <div>
                  <div className="font-bold mb-1">• Birthday Month</div>
                  <div className="opacity-80">Double points all month</div>
                </div>
                <div>
                  <div className="font-bold mb-1">• Complete Package</div>
                  <div className="opacity-80">50% bonus points</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoyaltyPoints