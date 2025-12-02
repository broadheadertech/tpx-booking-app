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
  Menu,
  X,
  Smartphone,
  Download,
  Search,
  ChevronRight,
  Map,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useBranding } from "../context/BrandingContext";
import Skeleton from "../components/common/Skeleton";

const Landing = () => {
  const navigate = useNavigate();
  const { branding, loading: brandingLoading } = useBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedService, setSelectedService] = useState("");

  // Fetch active services and branches from Convex
  const services = useQuery(api.services.services.getActiveServices);
  const branches = useQuery(api.services.branches.getActiveBranches);
  
  const loadingServices = services === undefined;
  const loadingBranches = branches === undefined;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const categories = [
    { name: "Haircuts", icon: Scissors },
    { name: "Beard Trim", icon: Users },
    { name: "Shaves", icon: Shield },
    { name: "Styling", icon: Star },
    { name: "Treatments", icon: Award },
    { name: "Packages", icon: Calendar },
  ];

  const testimonials = [
    {
      name: "Miguel Santos",
      role: "Regular Client",
      comment: "The attention to detail is unmatched. I've never had a barber take this much care with my fade.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=miguel",
    },
    {
      name: "Carlos Rivera",
      role: "Business Owner",
      comment: "Perfect for my busy schedule. Booking is seamless and they always run on time.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=carlos",
    },
    {
      name: "David Chen",
      role: "Software Engineer",
      comment: "The ambiance is amazing. It's not just a haircut, it's a relaxing break from my day.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=david",
    },
  ];

  if (brandingLoading || loadingServices || loadingBranches) {
    return (
      <div className="min-h-screen bg-black text-white">
        <nav className="fixed top-0 left-0 right-0 z-50 py-6 bg-black border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <Skeleton className="w-32 h-10" />
            <div className="hidden md:flex gap-8">
              <Skeleton className="w-20 h-6" />
              <Skeleton className="w-20 h-6" />
              <Skeleton className="w-20 h-6" />
            </div>
          </div>
        </nav>
        <div className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="w-full h-[400px] rounded-2xl mb-12 bg-gray-800" />
          <div className="grid md:grid-cols-4 gap-6">
             {[...Array(4)].map((_, i) => (
               <Skeleton key={i} className="w-full h-64 rounded-xl bg-gray-800" />
             ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter top 4 services for recommended section
  const recommendedServices = services ? services.slice(0, 4) : [];

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-[var(--color-primary)]/30">
      <style>{`
        :root {
          --color-bg: #000000;
          --color-text: #ffffff;
        }
      `}</style>

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-black/80 backdrop-blur-md border-b border-white/10 py-4"
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
              {branding?.logo_light_url ? (
                <img
                  src={branding.logo_light_url}
                  alt="Logo"
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20">
                  <Scissors className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-none text-white">
                  {branding?.display_name || "Title"}
                </h1>
                <p className="text-[10px] font-medium tracking-[0.2em] uppercase mt-1 text-gray-400">
                  Premium Grooming
                </p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">For Business</a>
              <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Help</a>
              
              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                <button
                  onClick={() => navigate("/auth/login")}
                  className="text-sm font-bold text-white hover:text-[var(--color-primary)] transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate("/guest/booking")}
                  className="px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 shadow-lg bg-[var(--color-primary)] text-white hover:brightness-110"
                >
                  Book Now
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-gray-900 border-b border-white/10 p-4 md:hidden flex flex-col gap-4 shadow-2xl">
            <a href="#services" className="text-lg font-medium text-gray-300 py-2">Services</a>
            <a href="#about" className="text-lg font-medium text-gray-300 py-2">About</a>
            <a href="#reviews" className="text-lg font-medium text-gray-300 py-2">Reviews</a>
            <hr className="border-white/10" />
            <button onClick={() => navigate("/auth/login")} className="text-left text-lg font-medium text-white py-2">Log In</button>
            <button onClick={() => navigate("/guest/booking")} className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold">Book Now</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={branding?.hero_image_url || "/landing/2.webp"}
            alt="Background"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Refine Your <br />
              <span className="text-[var(--color-primary)]">
                Signature Look
              </span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-lg">
              Experience the pinnacle of grooming. Where traditional
              barbering meets modern luxury.{" "}
            </p>

            {/* Search Box */}
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-[var(--color-primary)] transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className={`w-full h-14 pl-12 pr-10 bg-transparent rounded-xl focus:bg-white/5 outline-none font-medium transition-colors appearance-none cursor-pointer [&>option]:bg-black [&>option]:text-white ${selectedService === "" ? "text-gray-400" : "text-white"}`}
                >
                  <option value="">Book your services...</option>
                  {services?.map(service => (
                    <option key={service._id} value={service._id}>{service.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              
              <div className="w-px h-10 bg-white/10 my-auto hidden md:block"></div>
              
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-[var(--color-primary)] transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className={`w-full h-14 pl-12 pr-10 bg-transparent rounded-xl focus:bg-white/5 outline-none font-medium transition-colors appearance-none cursor-pointer [&>option]:bg-black [&>option]:text-white ${selectedBranch === "" ? "text-gray-400" : "text-white"}`}
                >
                  <option value="">Select branch...</option>
                  {branches?.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              
              <button 
                onClick={() => navigate('/guest/booking')}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white h-14 px-8 rounded-xl font-bold transition-colors shadow-lg shadow-[var(--color-primary)]/20"
              >
                Search
              </button>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="text-sm text-gray-500 font-medium">Popular:</span>
              {['Haircut', 'Massage', 'Skin Fade', 'Beard Trim'].map((tag) => (
                <button key={tag} className="text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full transition-colors border border-white/5 hover:border-white/20">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 border-b border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-white mb-8">Browse by category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <div 
                key={index}
                className="group cursor-pointer p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[var(--color-primary)]/30 transition-all duration-300 flex flex-col items-center gap-3 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)] transition-colors">
                  <category.icon className="w-6 h-6" />
                </div>
                <span className="font-semibold text-gray-300 group-hover:text-white">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Section */}
      <section className="py-20 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white">Recommended for you</h2>
              <p className="text-gray-500 mt-2">Top rated services in your area</p>
            </div>
            <button 
              onClick={() => navigate('/guest/booking')}
              className="hidden md:flex items-center gap-2 text-[var(--color-primary)] font-bold hover:brightness-110 transition-all"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedServices.map((service, index) => (
              <div 
                key={index}
                className="bg-gray-900 rounded-2xl overflow-hidden border border-white/5 hover:border-[var(--color-primary)]/30 hover:shadow-xl hover:shadow-[var(--color-primary)]/5 transition-all duration-300 cursor-pointer group"
                onClick={() => navigate('/guest/booking')}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-800">
                  <img 
                    src={service.image || "/landing/2.webp"} 
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-white border border-white/10">
                    {service.category || "Service"}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-white mb-1 group-hover:text-[var(--color-primary)] transition-colors">{service.name}</h3>
                  <p className="text-gray-400 text-sm mb-3 flex items-center gap-1 line-clamp-1">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1 bg-[var(--color-primary)]/10 px-2 py-0.5 rounded text-[var(--color-primary)] text-xs font-bold border border-[var(--color-primary)]/20">
                      <span className="font-black">5.0</span>
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                    <span className="text-xs text-gray-500">(25+ reviews)</span>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Price</p>
                      <p className="font-bold text-white">₱{service.price}</p>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-white text-black text-sm font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                      Book
                    </button>
                  </div>
                </div>
                <span className="font-semibold text-gray-300 group-hover:text-white">
                  {category.name}
                </span>
              </div>
            ))}
            {recommendedServices.length === 0 && !loadingServices && (
               <div className="col-span-full text-center py-10 text-gray-500">
                 No services found.
               </div>
            )}
          </div>
          
          <button 
            onClick={() => navigate('/guest/booking')}
            className="md:hidden w-full mt-8 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            View all services <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Why Choose Us - Dark Style */}
      <section className="py-20 bg-black border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="/landing/4.webp"
                  alt="Barber working"
                  className="rounded-2xl w-full h-64 object-cover mt-12 shadow-2xl shadow-[var(--color-primary)]/10 border border-white/5"
                />
                <img
                  src="/landing/2.webp"
                  alt="Haircut detail"
                  className="rounded-2xl w-full h-64 object-cover shadow-2xl shadow-[var(--color-primary)]/10 border border-white/5"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold tracking-wider uppercase mb-6 border border-[var(--color-primary)]/20">
                <Award className="w-4 h-4" />
                World Class Service
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Why {branding?.display_name || "Tipuno X"} is the best choice
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                We combine traditional barbering techniques with modern styling to create a unique experience. Our platform makes booking easier than ever.
              </p>

              <div className="space-y-6">
                {[
                  { title: "Expert Barbers", desc: "Highly trained professionals", icon: Users },
                  { title: "Easy Booking", desc: "Book in seconds, 24/7", icon: Clock },
                  { title: "Hygienic Safe", desc: "Top-tier sterilization", icon: Shield }
                ].map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1 text-white">{feature.title}</h3>
                      <p className="text-gray-500 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Download */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div
            className="rounded-3xl p-8 md:p-16 relative overflow-hidden"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <div className="absolute top-0 right-0 w-full h-full bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-white space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold">
                  Get the {branding?.display_name} App
                </h2>
                <p className="text-white/80 text-lg max-w-md">
                  Book appointments, track your loyalty points, and get
                  exclusive offers right from your phone.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors border border-white/10">
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
                  <button className="flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors border border-white/10">
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
      <footer className="bg-black border-t border-white/10 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                {branding?.logo_light_url ? (
                  <img
                    src={branding.logo_light_url}
                    alt="Logo"
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Scissors className="w-6 h-6 text-[var(--color-primary)]" />
                )}
                <span className="text-xl font-bold text-white">{branding?.display_name || "Tipuno X"}</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Premium grooming experiences for the modern gentleman. Elevating style, one cut at a time.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-white">Quick Links</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">Home</a></li>
                <li><a href="#services" className="hover:text-[var(--color-primary)] transition-colors">Services</a></li>
                <li><a href="#about" className="hover:text-[var(--color-primary)] transition-colors">About Us</a></li>
                <li><a href="#reviews" className="hover:text-[var(--color-primary)] transition-colors">Reviews</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-white">Contact</h4>
              <ul className="space-y-4 text-sm text-gray-500">
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
              <h4 className="font-bold mb-6 text-white">Newsletter</h4>
              <p className="text-gray-500 text-sm mb-4">Subscribe for updates and exclusive offers.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)] text-white placeholder-gray-500"
                />
                <button
                  className="p-2 rounded-lg transition-colors text-white bg-[var(--color-primary)] hover:bg-[var(--color-accent)]"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© 2024 {branding?.display_name || "Tipuno X"}. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
