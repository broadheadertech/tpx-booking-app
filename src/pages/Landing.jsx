import React, { useState, useEffect } from "react";
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
  Menu,
  X,
  Smartphone,
  Download,
} from "lucide-react";
import { useBranding } from "../context/BrandingContext";

const Landing = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    {
      title: "Premium Haircuts",
      description:
        "Expert styling with precision and attention to detail. Includes wash and style.",
      price: "₱299",
      image: "/landing/2.webp",
      popular: true,
    },
    {
      title: "Beard Grooming",
      description:
        "Professional beard trimming, sculpting, and hot towel service.",
      price: "₱199",
      image: "/landing/4.webp",
      popular: false,
    },
    {
      title: "Hair Treatments",
      description:
        "Revitalizing treatments for scalp health and hair vitality.",
      price: "₱399",
      image: "/landing/7.jpg",
      popular: false,
    },
    {
      title: "The Full Experience",
      description: "Complete haircut, shave, and facial treatment package.",
      price: "₱599",
      image: "/landing/8.webp",
      popular: false,
    },
  ];

  const features = [
    {
      title: "Master Barbers",
      description:
        "Our team consists of award-winning professionals with over 10 years of experience.",
      icon: Users,
    },
    {
      title: "Premium Products",
      description:
        "We use only top-tier, imported grooming products for the best results.",
      icon: Award,
    },
    {
      title: "Hygienic & Safe",
      description:
        "Hospital-grade sterilization protocols for all tools and equipment.",
      icon: Shield,
    },
  ];

  const testimonials = [
    {
      name: "Miguel Santos",
      role: "Regular Client",
      comment:
        "The attention to detail is unmatched. I've never had a barber take this much care with my fade.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=miguel",
    },
    {
      name: "Carlos Rivera",
      role: "Business Owner",
      comment:
        "Perfect for my busy schedule. Booking is seamless and they always run on time.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=carlos",
    },
    {
      name: "David Chen",
      role: "Software Engineer",
      comment:
        "The ambiance is amazing. It's not just a haircut, it's a relaxing break from my day.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=david",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-[var(--color-primary)]/30">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? "bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-white/5 py-4"
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <img
                src={
                  branding?.logo_light_url || "/img/tipuno_x_logo_white.avif"
                }
                alt="Logo"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">
                  {branding?.display_name || 'TipunoX'}
                </h1>
                <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[var(--color-primary)]">
                  Premium Grooming
                </p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">Services</a>
              <a href="#about" className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">About</a>
              <a href="#reviews" className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">Reviews</a>

              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <button
                  onClick={() => navigate("/auth/login")}
                  className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/guest/booking")}
                  className="px-5 py-2.5 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] text-sm font-bold hover:opacity-90 transition-all transform hover:scale-105 active:scale-95"
                >
                  Book Now
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-[var(--color-text)]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-[var(--color-bg)]/95 backdrop-blur-xl border-b border-white/10 p-4 md:hidden flex flex-col gap-4">
            <a href="#services" className="text-lg font-medium text-[var(--color-muted)] py-2">Services</a>
            <a href="#about" className="text-lg font-medium text-[var(--color-muted)] py-2">About</a>
            <a href="#reviews" className="text-lg font-medium text-[var(--color-muted)] py-2">Reviews</a>
            <hr className="border-white/10" />
            <button onClick={() => navigate("/auth/login")} className="text-left text-lg font-medium text-[var(--color-text)] py-2">Sign In</button>
            <button onClick={() => navigate("/guest/booking")} className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold">Book Now</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at top right, color-mix(in srgb, var(--color-primary) 20%, transparent), var(--color-bg), var(--color-bg))`
            }}
          ></div>
          <div
            className="absolute top-0 right-0 w-2/3 h-full"
            style={{
              background: `linear-gradient(to left, color-mix(in srgb, var(--color-primary) 5%, transparent), transparent)`
            }}
          ></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase"
                style={{
                  border: `1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)`,
                  backgroundColor: `color-mix(in srgb, var(--color-primary) 10%, transparent)`,
                  color: 'var(--color-primary)'
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                ></span>
                Now Accepting Bookings
              </div>

              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
                Bright Ideas <br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-accent))`
                  }}
                >
                  Inspire Change
                </span>
              </h1>

              <p className="text-lg text-[var(--color-muted)] max-w-lg leading-relaxed">
               Here at {branding?.display_name || 'TipunoX'}, 
                We Simplify Management and Amplify Results.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => navigate("/guest/booking")}
                  className="px-8 py-4 rounded-full bg-[var(--color-primary)] text-white font-bold text-lg hover:bg-[var(--color-accent)] transition-all flex items-center justify-center gap-2"
                  style={{
                    boxShadow: `0 0 30px color-mix(in srgb, var(--color-primary) 30%, transparent)`
                  }}
                >
                  <Calendar className="w-5 h-5" />
                  Book a Demo
                </button>
                {/* <button
                  onClick={() => navigate("/auth/login")}
                  className="px-8 py-4 rounded-full border border-white/10 bg-white/5 text-[var(--color-text)] font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
                >
                  Sign In
                </button> */}
              </div>

              <div className="flex items-center gap-8 pt-8 border-t border-white/5">
                <div>
                  <p className="text-3xl font-bold text-[var(--color-text)]">4.9</p>
                  <div className="flex text-[var(--color-primary)] text-xs mt-1">
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div>
                  <p className="text-3xl font-bold text-[var(--color-text)]">2.5k+</p>
                  <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mt-1">Clients</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="relative z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src="/landing/1.avif"
                  alt="Barber"
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />                
              </div>

              {/* Decorative elements */}
              <div
                className="absolute -top-10 -right-10 w-64 h-64 rounded-full blur-3xl -z-10"
                style={{ backgroundColor: `color-mix(in srgb, var(--color-primary) 20%, transparent)` }}
              ></div>
              <div
                className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full blur-3xl -z-10"
                style={{ backgroundColor: `color-mix(in srgb, var(--color-accent) 10%, transparent)` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 relative" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg) 95%, white)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--color-text)]">Premium Services</h2>
            <p className="text-[var(--color-muted)] max-w-2xl mx-auto">
              Tailored grooming services designed for the modern gentleman.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="group relative rounded-2xl overflow-hidden border border-white/5 transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-bg) 90%, white)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    border: `1px solid color-mix(in srgb, var(--color-primary) 50%, transparent)`,
                    borderRadius: '1rem'
                  }}
                ></div>
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div
                    className="absolute inset-0 opacity-90"
                    style={{ background: `linear-gradient(to top, color-mix(in srgb, var(--color-bg) 90%, white), transparent)` }}
                  ></div>
                  <div className="absolute bottom-4 left-4">
                    <p className="text-[var(--color-primary)] font-bold text-lg">{service.price}</p>
                  </div>
                </div>
                <div className="p-6 relative">
                  <h3 className="text-xl font-bold mb-2 text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{service.title}</h3>
                  <p className="text-[var(--color-muted)] text-sm mb-4 line-clamp-2">{service.description}</p>
                  <button
                    onClick={() => navigate("/guest/booking")}
                    className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2 group-hover:gap-3 transition-all"
                  >
                    Book Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-24 bg-[var(--color-bg)] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px]"
            style={{ backgroundColor: `color-mix(in srgb, var(--color-primary) 10%, transparent)` }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[var(--color-text)]">
                Why Choose <span className="text-[var(--color-primary)]">{branding?.display_name || 'TipunoX'}</span>?
              </h2>
              <p className="text-[var(--color-muted)] text-lg mb-8 leading-relaxed">
                We don't just cut hair; we cultivate confidence. Our barbershop combines traditional techniques with modern style to give you the best grooming experience in the city.
              </p>

              <div className="space-y-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-bg) 90%, white)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <feature.icon className="w-6 h-6 text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2 text-[var(--color-text)]">{feature.title}</h3>
                      <p className="text-[var(--color-muted)] text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="/landing/4.webp"
                  alt="Barber working"
                  className="rounded-2xl w-full h-64 object-cover mt-12"
                />
                <img
                  src="/landing/2.webp"
                  alt="Haircut detail"
                  className="rounded-2xl w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="py-24" style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg) 95%, white)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2 text-[var(--color-text)]">Client Stories</h2>
              <p className="text-[var(--color-muted)]">Don't just take our word for it.</p>
            </div>
            <div className="hidden md:flex gap-2">
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-[var(--color-text)]">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg) 90%, white)' }}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[var(--color-primary)] fill-current" />
                  ))}
                </div>
                <p className="text-[var(--color-muted)] mb-6 leading-relaxed">"{t.comment}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                    <img
                      src={t.image}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[var(--color-text)]">{t.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{t.role}</p>
                  </div>
                </div>
                <div className="p-6 relative">
                  {/* Remove these if you don't have service info here */}
                  {/* Or you can include service info if relevant */}
                  {/* <h3 className="text-xl font-bold mb-2 group-hover:text-orange-500 transition-colors">{t.title}</h3>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{t.description}</p> */}
                  <button
                    onClick={() => navigate("/guest/booking")}
                    className="text-sm font-semibold text-white flex items-center gap-2 group-hover:gap-3 transition-all"
                  >
                    Book Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div
            className="rounded-3xl p-8 md:p-16 relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <div className="absolute top-0 right-0 w-full h-full bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-white space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold">Get the {branding?.display_name} App</h2>
                <p className="text-white/80 text-lg max-w-md">
                  Book appointments, track your loyalty points, and get exclusive offers right from your phone.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors">
                    <Smartphone className="w-6 h-6" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-gray-400">
                        Download on the
                      </p>
                      <p className="text-sm font-bold leading-none">
                        App Store
                      </p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors">
                    <Download className="w-6 h-6" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-gray-400">
                        Get it on
                      </p>
                      <p className="text-sm font-bold leading-none">
                        Google Play
                      </p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="relative hidden md:block">
                <img
                  src="/screenshots/ss1.png"
                  alt="App Screenshot"
                  className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-64 rounded-3xl shadow-2xl rotate-12 hover:rotate-0 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-bg)] border-t border-white/10 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <img
                  src={
                    branding?.logo_light_url || "/img/tipuno_x_logo_white.avif"
                  }
                  alt="Logo"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold text-[var(--color-text)]">{branding?.display_name || 'TipunoX'}</span>
              </div>
              <p className="text-[var(--color-muted)] text-sm leading-relaxed">
                Premium grooming experiences for the modern gentleman. Elevating style, one cut at a time.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-[var(--color-text)]">Quick Links</h4>
              <ul className="space-y-4 text-sm text-[var(--color-muted)]">
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">Home</a></li>
                <li><a href="#services" className="hover:text-[var(--color-primary)] transition-colors">Services</a></li>
                <li><a href="#about" className="hover:text-[var(--color-primary)] transition-colors">About Us</a></li>
                <li><a href="#reviews" className="hover:text-[var(--color-primary)] transition-colors">Reviews</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-[var(--color-text)]">Contact</h4>
              <ul className="space-y-4 text-sm text-[var(--color-muted)]">
                <li className="flex items-center gap-3">
                  <MapPin className="w-4 h-4" />
                  123 Main Street, Quezon City
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4" />
                  +63 912 345 6789
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  Mon-Sat: 9am - 9pm
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-[var(--color-text)]">Newsletter</h4>
              <p className="text-[var(--color-muted)] text-sm mb-4">Subscribe for updates and exclusive offers.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
                />
                <button
                  className="p-2 rounded-lg transition-colors text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[var(--color-muted)] text-sm">© 2024 {branding?.display_name}. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-[var(--color-muted)]">
              <a href="#" className="hover:text-[var(--color-text)] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--color-text)] transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
