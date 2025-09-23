import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Scissors,
  Star,
  MapPin,
  Phone,
  Clock,
  Users,
  Award,
  Shield,
  ArrowRight,
  Check,
  TrendingUp,
  Heart,
  Sparkles,
} from "lucide-react";
import Button from "../components/common/Button";
import bannerImage from "../assets/img/banner.jpg";

const Landing = () => {
  const navigate = useNavigate();

  const services = [
    {
      title: "Premium Haircuts",
      description: "Expert styling with precision and attention to detail",
      icon: Scissors,
      price: "Starting at ₱299",
      popular: true,
    },
    {
      title: "Beard Grooming",
      description: "Professional beard trimming and styling services",
      icon: Star,
      price: "Starting at ₱199",
      popular: false,
    },
    {
      title: "Hair Treatments",
      description: "Nourishing treatments for healthy, vibrant hair",
      icon: Award,
      price: "Starting at ₱399",
      popular: false,
    },
    {
      title: "Hot Towel Shave",
      description: "Relaxing traditional shave with premium hot towel service",
      icon: Sparkles,
      price: "Starting at ₱249",
      popular: false,
    },
  ];

  const features = [
    {
      title: "Expert Barbers",
      description: "Skilled professionals with years of experience",
      icon: Users,
      stat: "10+ Years",
    },
    {
      title: "Premium Products",
      description: "Only the finest grooming products and tools",
      icon: Award,
      stat: "Top Brands",
    },
    {
      title: "Hygienic Standards",
      description: "Strict cleanliness protocols for your safety",
      icon: Shield,
      stat: "100% Safe",
    },
  ];

  const testimonials = [
    {
      name: "Miguel Santos",
      rating: 5,
      comment:
        "Best barbershop experience in the city. Professional service and great atmosphere.",
      initials: "MS",
      service: "Premium Haircut",
    },
    {
      name: "Carlos Rivera",
      rating: 5,
      comment:
        "Amazing attention to detail. My go-to place for all grooming needs.",
      initials: "CR",
      service: "Beard Grooming",
    },
    {
      name: "Juan dela Cruz",
      rating: 5,
      comment: "Top-notch service every time. Highly recommend TPX Barbershop!",
      initials: "JC",
      service: "Hair Treatment",
    },
  ];

  const stats = [
    { label: "Happy Customers", value: "2,500+", icon: Heart },
    { label: "Services Completed", value: "5,000+", icon: TrendingUp },
    { label: "Years of Experience", value: "10+", icon: Award },
    { label: "Expert Barbers", value: "8", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#0a0a0a] backdrop-blur-xl border-b border-gray-800/30 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <img
                src="/img/tipuno_x_logo_white.avif"
                alt="TPX Barbershop Logo"
                className="w-12 h-12 object-contain filter brightness-110 contrast-125"
              />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                  TPX Barbershop
                </h1>
                <p className="text-xs text-orange-400 font-medium tracking-wider uppercase font-sans">
                  Premium Grooming
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center space-x-2">
              <button
                onClick={() =>
                  navigate("/platform-selection", {
                    state: { action: "signin" },
                  })
                }
                className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 group"
              >
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 bg-gray-800/50 rounded-lg scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"></div>
              </button>
              <button
                onClick={() =>
                  navigate("/platform-selection", {
                    state: { action: "booking" },
                  })
                }
                className="relative px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg shadow-xl hover:shadow-orange-600/40 transition-all duration-300 group overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Book Now
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-white/15 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
              </button>
              <button
                onClick={() => navigate("/privacy")}
                className="relative px-3 py-2 text-sm font-medium text-gray-500 hover:text-white transition-all duration-300 group font-sans"
              >
                <span className="relative z-10">Policy</span>
                <div className="absolute bottom-0 left-1/2 w-0 h-px bg-orange-500 transition-all duration-300 group-hover:w-3/4 group-hover:left-1/8"></div>
                <div className="absolute inset-0 bg-gray-800/30 rounded-lg scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"></div>
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button className="lg:hidden relative p-2 text-gray-400 hover:text-white transition-all duration-300 group">
              <div className="absolute inset-0 bg-gray-800/50 rounded-lg scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"></div>
              <svg
                className="w-5 h-5 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <div className="absolute top-2 right-2 w-1 h-1 bg-orange-500 rounded-full opacity-60"></div>
            </button>
          </div>
        </div>

        {/* Sophisticated bottom highlight */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent"></div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gray-900 py-20 overflow-hidden">
        {/* Barbershop Background Images */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/landing/1.avif')`,
            }}
          ></div>
        </div>

        {/* Black overlay for better text readability */}
        <div className="absolute inset-0 bg-black/75"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-block bg-orange-600/20 border border-orange-500/30 text-orange-400 px-4 py-2 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
                Professional Barbershop Services
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
                Premium grooming
                <br />
                <span className="text-orange-500">in Angeles City</span>
              </h1>

              <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                Experience expert haircuts, professional beard grooming, and
                premium styling services. Book your appointment with TPX
                Barbershop today.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button
                  onClick={() =>
                    navigate("/platform-selection", {
                      state: { action: "booking" },
                    })
                  }
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/25"
                >
                  <Calendar className="w-5 h-5" />
                  Book Appointment
                </button>
                <button
                  onClick={() =>
                    navigate("/platform-selection", {
                      state: { action: "signin" },
                    })
                  }
                  className="border-2 border-gray-600 text-gray-300 px-8 py-4 rounded-lg font-semibold text-lg hover:border-orange-500 hover:text-white transition-all duration-200 backdrop-blur-sm"
                >
                  Sign In
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-700">
                <div>
                  <div className="text-2xl font-bold text-white">2,500+</div>
                  <div className="text-sm text-gray-400">Happy Clients</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">10+</div>
                  <div className="text-sm text-gray-400">Years Experience</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">4.9</div>
                  <div className="text-sm text-gray-400 flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                    Rating
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Multiple App Screenshots */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                {/* Main Dashboard Screenshot - Center */}
                <div className="relative z-30 flex justify-center">
                  <img
                    src="/screenshots/ss3.png"
                    alt="TPX Barbershop Dashboard"
                    className="w-[300px] rounded-3xl shadow-2xl hover:scale-105 transition-all duration-500"
                  />
                </div>

                {/* Welcome Screenshot - Left Side */}
                <div className="absolute top-8 -left-16 z-20 hidden lg:block">
                  <img
                    src="/screenshots/ss2.png"
                    alt="TPX Welcome Screen"
                    className="w-[200px] rounded-2xl shadow-xl transform -rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-300 opacity-85 hover:opacity-100"
                  />
                </div>

                {/* AI Assistant Screenshot - Right Side */}
                <div className="absolute top-16 -right-12 z-20 hidden lg:block">
                  <img
                    src="/screenshots/ss4.png"
                    alt="AI Style Assistant"
                    className="w-[180px] rounded-2xl shadow-xl transform rotate-8 hover:rotate-0 hover:scale-110 transition-all duration-300 opacity-85 hover:opacity-100"
                  />
                </div>

                {/* Mobile view - Show smaller screenshots below */}
                <div className="flex justify-center gap-4 mt-8 lg:hidden">
                  <img
                    src="/screenshots/ss2.png"
                    alt="Welcome Screen"
                    className="w-[130px] rounded-2xl shadow-lg opacity-80"
                  />
                  <img
                    src="/screenshots/ss4.png"
                    alt="AI Assistant"
                    className="w-[130px] rounded-2xl shadow-lg opacity-80"
                  />
                </div>

                {/* Enhanced Rating Badge with Glassmorphism */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-40">
                  <div className="bg-white/90 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-2xl border border-white/50 flex items-center gap-3 hover:bg-white/95 transition-all duration-300">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>
                    <div className="border-l border-gray-300 pl-3">
                      <span className="font-bold text-gray-900 text-lg">
                        4.9
                      </span>
                      <span className="text-gray-600 text-sm ml-1">
                        2,500+ reviews
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="relative py-20 bg-gray-900 overflow-hidden">
        {/* Barbershop Background Image */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/landing/3.jpeg')`,
            }}
          ></div>
        </div>

        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/95"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Professional grooming services designed to make you look and feel
              your best
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => {
              return (
                <div
                  key={index}
                  className="group border border-gray-700/50 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-gray-800/90 backdrop-blur-sm"
                >
                  {/* Service Image */}
                  <div className="h-48 relative overflow-hidden bg-gray-100">
                    <img
                      src={
                        index === 0
                          ? "/landing/2.webp"
                          : index === 1
                            ? "/landing/4.webp"
                            : index === 2
                              ? "/landing/7.jpg"
                              : "/landing/8.webp"
                      }
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                    {service.popular && (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="bg-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="text-lg font-bold mb-1">
                        {service.title}
                      </h3>
                      <p className="text-sm text-gray-200">{service.price}</p>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                      {service.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 text-yellow-400 fill-current"
                          />
                        ))}
                        <span className="text-gray-400 text-sm ml-2">
                          (4.9)
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">30-45 min</span>
                    </div>

                    <button
                      onClick={() => navigate("/auth/register")}
                      className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors duration-200"
                    >
                      Book Service
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose TPX */}
      <section className="py-16 bg-gray-900 relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/landing/5.jpg')" }}
          ></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Why Choose TPX Barbershop
            </h2>
            <div className="w-20 h-1 bg-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Real barbers, real skills, real results
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
                >
                  <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="text-orange-400 font-medium">
                    {feature.stat}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-4 text-gray-400 text-sm">
              <span>Established 2014</span>
              <span>•</span>
              <span>2,500+ Happy Clients</span>
              <span>•</span>
              <span>Quezon City</span>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What our customers say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Real reviews from satisfied customers who trust TPX Barbershop
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl p-8 hover:shadow-md transition-shadow"
              >
                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                  <span className="text-gray-600 ml-2 text-sm">5.0</span>
                </div>

                {/* Review Text */}
                <p className="text-gray-700 mb-6 leading-relaxed text-lg">
                  "{testimonial.comment}"
                </p>

                {/* Customer Info */}
                <div className="flex items-center pt-4 border-t border-gray-100">
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.initials}
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">
                      {testimonial.name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {testimonial.service}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Showcase */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Download the TPX app
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience seamless booking, AI-powered style recommendations, and
              manage your grooming appointments on the go.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* App Features */}
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Easy Booking
                    </h3>
                    <p className="text-gray-600">
                      Schedule appointments instantly with our intuitive booking
                      system. View available slots and book your preferred time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      AI Style Assistant
                    </h3>
                    <p className="text-gray-600">
                      Get personalized style recommendations powered by AI.
                      Advanced head shape and hair analysis for perfect
                      suggestions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Personal Dashboard
                    </h3>
                    <p className="text-gray-600">
                      Track your bookings, manage vouchers, and access shop
                      information all in one convenient dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Premium Experience
                    </h3>
                    <p className="text-gray-600">
                      Enjoy a premium barbershop experience with professional
                      service tracking and loyalty rewards.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <button
                  onClick={() => navigate("/auth/register")}
                  className="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                >
                  Download App & Book Now
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* App Download Visual */}
            <div className="relative">
              <div className="flex justify-center items-center space-x-8">
                {/* Main Phone - Login Screen */}
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <img
                    src="/screenshots/ss1.png"
                    alt="TPX Barbershop Mobile App"
                    className="w-full max-w-[250px] rounded-3xl shadow-2xl"
                  />
                </div>

                {/* Download Info */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center">
                      <div className="text-xs font-bold text-gray-900">QR</div>
                    </div>
                  </div>
                  <p className="text-gray-600 font-medium mb-2">
                    Scan to download
                  </p>
                  <p className="text-sm text-gray-500">
                    Available on iOS & Android
                  </p>
                </div>
              </div>

              {/* Feature highlights */}
              <div className="absolute -top-8 -left-8 bg-orange-600 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg">
                Easy Login
              </div>

              <div className="absolute -bottom-8 -right-8 bg-white p-3 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    Premium Features
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Visit our barbershop
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Located in the heart of Quezon City, our modern barbershop
                offers a premium grooming experience in a comfortable,
                professional environment.
              </p>

              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Address</p>
                    <p className="text-gray-600">
                      123 Main Street, Quezon City
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Phone</p>
                    <p className="text-gray-600">+63 912 345 6789</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Hours</p>
                    <p className="text-gray-600">
                      Monday - Saturday: 9:00 AM - 8:00 PM
                    </p>
                    <p className="text-gray-500 text-sm">Closed Sundays</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Ready to book?
              </h3>
              <p className="text-gray-600 mb-8">
                Join over 2,500 satisfied customers who trust TPX Barbershop for
                their grooming needs.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Professional expert barbers",
                  "Premium quality products",
                  "Clean, modern facilities",
                  "Convenient online booking",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate("/auth/register")}
                className="w-full bg-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Book Your Appointment
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                <img
                  src="/img/tipuno_x_logo_white.avif"
                  alt="TPX Barbershop Logo"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">TPX Barbershop</h3>
                <p className="text-orange-500 text-sm font-medium">
                  Professional Grooming Services
                </p>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              © 2024 TPX Barbershop. All rights reserved.
            </p>
            <div className="text-gray-500 text-sm flex items-center justify-center gap-4">
              <button
                onClick={() => navigate("/privacy")}
                className="hover:text-white"
              >
                Policy
              </button>
              <span>•</span>
              <button
                onClick={() => navigate("/account-deletion")}
                className="hover:text-white"
              >
                Account Deletion
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
