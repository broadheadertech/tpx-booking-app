import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
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
  X,
  Smartphone,
  Download,
  Menu,
} from "lucide-react";
import { useBranding } from "../context/BrandingContext";

const Landing = () => {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [defaultPurpose, setDefaultPurpose] = useState("");

  const openModal = (presetPurpose) => {
    setDefaultPurpose(presetPurpose);
    setPurpose(presetPurpose); // prefill purpose field
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEmail("");
    setPurpose("");
    setDefaultPurpose("");
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const submitDemoRequest = () => {
    // TODO: API call here
    console.log({ email, purpose });

    setShowSuccess(true); // show success message
    setEmail("");
    setPurpose("");

    // Automatically hide the success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
      closeModal(); // close the modal after showing message
    }, 1000);
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    {
      title: "Inventory Management",
      description:
        "Track stock levels in real time, automate low-stock alerts, and manage product variants across locations.",
      price: "Included",
      image: "/landing/pos-inventory.jpg",
      popular: true,
    },
    {
      title: "Sales & Checkout",
      description:
        "Fast, secure POS checkout with product scanning, discounts, receipts, and multiple payment options.",
      price: "Included",
      image: "/landing/pos-sales.jpg",
      popular: false,
    },
    {
      title: "Employee & Payroll",
      description:
        "Manage staff schedules, time logs, and automated payroll calculations — all in one place.",
      price: "Included",
      image: "/landing/pos-payroll.jpg",
      popular: false,
    },
    {
      title: "Business Analytics",
      description:
        "Get actionable insights with real-time dashboards, sales reports, customer data, and performance trends.",
      price: "Included",
      image: "/landing/pos-analytics-2.jpg",
      popular: false,
    },
  ];

  const features = [
    {
      title: "Seamless Inventory",
      description:
        "Easily track stock, manage product variants, and receive low-stock alerts in real-time.",
      icon: Users,
    },
    {
      title: "Smart Analytics",
      description:
        "Get actionable insights with sales reports, customer trends, and business performance dashboards.",
      icon: Award,
    },
    {
      title: "Secure & Reliable",
      description:
        "Protect your business with secure payment processing, user roles, and data backup protocols.",
      icon: Shield,
    },
  ];

  const testimonials = [
    {
      name: "Miguel Santos",
      role: "Small Business Owner",
      comment:
        "AVEX-A completely transformed how I manage my store. Inventory, sales, and payroll are now all in one place. Highly recommend!",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=miguel",
    },
    {
      name: "Carlos Rivera",
      role: "Retail Manager",
      comment:
        "Using AVEX-A has made our operations seamless. The analytics dashboard gives us insights we never had before.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=carlos",
    },
    {
      name: "David Chen",
      role: "Cafe Owner",
      comment:
        "From sales tracking to employee management, AVEX-A handles it all. It’s the ultimate all-in-one POS solution.",
      rating: 5,
      image: "https://i.pravatar.cc/150?u=david",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-[var(--color-primary)]/30">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
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
                  {branding?.display_name || "AVEX-A"}
                </h1>
                <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[var(--color-primary)]">
                  Simplify Management. Amplify Results.
                </p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#services"
                className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Services
              </a>
              <a
                href="#about"
                className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                About
              </a>
              <a
                href="#reviews"
                className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Reviews
              </a>

              <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                {/* <button
                  onClick={() => navigate("/auth/login")}
                  className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openModal("Book Now")}
                  className="px-5 py-2.5 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] text-sm font-bold hover:opacity-90 transition-all transform hover:scale-105 active:scale-95"
                >
                  Book Now
                </button> */}
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
            <a
              href="#services"
              className="text-lg font-medium text-[var(--color-muted)] py-2"
            >
              Services
            </a>
            <a
              href="#about"
              className="text-lg font-medium text-[var(--color-muted)] py-2"
            >
              About
            </a>
            <a
              href="#reviews"
              className="text-lg font-medium text-[var(--color-muted)] py-2"
            >
              Reviews
            </a>
            <hr className="border-white/10" />
            <button
              onClick={() => navigate("/auth/login")}
              className="text-left text-lg font-medium text-[var(--color-text)] py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => openModal("Book Now")}
              className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold"
            >
              Book Now
            </button>
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
              background: `radial-gradient(ellipse at top right, color-mix(in srgb, var(--color-primary) 20%, transparent), var(--color-bg), var(--color-bg))`,
            }}
          ></div>
          <div
            className="absolute top-0 right-0 w-2/3 h-full"
            style={{
              background: `linear-gradient(to left, color-mix(in srgb, var(--color-primary) 5%, transparent), transparent)`,
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
                  color: "var(--color-primary)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "var(--color-primary)" }}
                ></span>
                Now Accepting Bookings
              </div>

              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]">
                Bright Ideas <br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                  }}
                >
                  Inspire Change
                </span>
              </h1>

              <p className="text-lg text-[var(--color-muted)] max-w-lg leading-relaxed">
                Here at {branding?.display_name || "AVEX-A"}, We Simplify
                Management and Amplify Results.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => openModal("Book a Demo")}
                  className="px-8 py-4 rounded-full bg-[var(--color-primary)] text-white font-bold text-lg hover:bg-[var(--color-accent)] transition-all flex items-center justify-center gap-2"
                  style={{
                    boxShadow: `0 0 30px color-mix(in srgb, var(--color-primary) 30%, transparent)`,
                  }}
                >
                  <Calendar className="w-5 h-5" />
                  Book a Demo
                </button>

                <button
                  onClick={() => openModal("Book Now")}
                  className="px-8 py-4 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  Book Now
                </button>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="relative z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src="/landing/1.png"
                  alt="Barber"
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
              </div>

              <div
                className="absolute -top-10 -right-10 w-64 h-64 rounded-full blur-3xl -z-10"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--color-primary) 20%, transparent)`,
                }}
              ></div>
              <div
                className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full blur-3xl -z-10"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--color-accent) 10%, transparent)`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white/10 dark:bg-gray-900/50 rounded-3xl shadow-2xl p-8 text-white">
            {/* Success Toast */}
            {showSuccess && (
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-full shadow-xl flex items-center gap-3 text-sm font-semibold animate-slideDown">
                <Check className="w-5 h-5" />
                Successfully submitted!
              </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-extrabold text-[var(--color-primary)]">
                Book a Demo
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-300 hover:text-white transition text-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Catchy Demo Phrase */}
            <p className="text-white/70 mb-6 text-sm">
              See how AVEX-A can supercharge your business in just 15 minutes!
            </p>

            {/* Form */}
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                submitDemoRequest();
              }}
            >
              {/* Email Input */}
              <div className="relative w-full">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 pt-5 pb-2 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition shadow-md"
                />
                <label className="absolute left-4 top-2 text-white/70 text-sm transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-white/40 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm peer-focus:text-[var(--color-primary)]">
                  Your Email
                </label>
              </div>

              {/* Purpose Textarea */}
              <div className="relative w-full">
                <textarea
                  required
                  rows={4}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 pt-5 pb-2 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition shadow-md resize-none"
                />
                <label className="absolute left-4 top-2 text-white/70 text-sm transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-white/40 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm peer-focus:text-[var(--color-primary)]">
                  Purpose of Demo
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[var(--color-primary)] text-white font-bold shadow-lg hover:opacity-90 transform hover:scale-105 transition-all"
                >
                  Submit
                </button>
              </div>
            </form>

            {/* Decorative Floating Circles */}
            <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-[var(--color-primary)]/20 opacity-30 blur-3xl animate-pulseSlow"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-[var(--color-primary)]/20 opacity-30 blur-3xl animate-pulseSlow"></div>
          </div>
        </div>
      )}

      {/* ... rest of your sections (Services, Features, Testimonials, App Download, Footer) remain unchanged */}
    </div>
  );
};

export default Landing;
