import { useState } from 'react';
import Icon from '../components/Icon.jsx';

/**
 * LandingPage — the marketing entry screen (adapted from the AI Stitch design).
 *
 * Fully responsive for mobile devices, tablets, and desktops.
 *
 * Props:
 *  - onSignIn:     open the auth screen in login mode
 *  - onGetStarted: open the auth screen in register (free trial) mode
 */

const FEATURES = [
  {
    icon: 'qr_code_scanner',
    iconWrap: 'bg-tertiary-fixed text-primary',
    title: 'Barcode & Receipt Auto-Scan',
    body: 'Snap physical grocery store receipts or scan barcodes in seconds to instantly populate shelf tallies.',
  },
  {
    icon: 'notifications_active',
    iconWrap: 'bg-secondary-container/40 text-secondary',
    title: 'Smart 48h Expiry Notifications',
    body: 'Thoughtful gentle reminders alert you before dairy, produce, and fresh herbs pass their culinary peak.',
  },
  {
    icon: 'menu_book',
    iconWrap: 'bg-secondary-container/40 text-secondary',
    title: 'Zero-Waste Recipe Matching',
    body: 'Instantly generates hearty, delicious culinary recipes using only ingredients already sitting in your kitchen.',
  },
];

export default function LandingPage({ onSignIn, onGetStarted }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenuAnd = (action) => {
    setMobileMenuOpen(false);
    action?.();
  };

  return (
    <div className="min-h-screen w-full bg-background text-on-surface antialiased font-sans">
      {/* Nav */}
      <header className="w-full border-b border-outline-variant/50 bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <a className="flex items-center gap-2 sm:gap-2.5 group" href="#" aria-label="Pantry Pal Home">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm">
              <Icon name="kitchen" className="text-[18px] sm:text-[20px]" />
            </span>
            <span className="text-title-md sm:text-title-lg font-bold tracking-tight text-primary">PantryPal</span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-label-md font-label-md text-on-surface-variant">
            <a className="text-primary font-semibold underline decoration-2 decoration-primary underline-offset-8" href="#features">Features</a>
            <a className="hover:text-primary transition-colors" href="#how-it-works">How It Works</a>
            <a className="hover:text-primary transition-colors" href="#recipes">Recipes</a>
            <a className="hover:text-primary transition-colors" href="#support">Support</a>
          </nav>

          {/* Right desktop buttons + Mobile hamburger */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <button
              className="text-label-sm sm:text-label-md font-semibold text-on-surface hover:text-primary transition-colors px-2 sm:px-0"
              onClick={onSignIn}
              type="button"
            >
              Sign In
            </button>
            <button
              className="hidden sm:inline-flex items-center gap-1.5 sm:gap-2 bg-primary hover:bg-primary-container text-on-primary px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-label-sm sm:text-label-md font-semibold tracking-tight shadow-sm hover:shadow transition-all group"
              onClick={onGetStarted}
              type="button"
            >
              <span>Get Started Free</span>
              <Icon name="arrow_forward" className="text-[15px] sm:text-[16px] transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Mobile hamburger button */}
            <button
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              type="button"
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[22px]" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-outline-variant/40 bg-surface px-4 py-4 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-2 text-title-sm font-medium text-on-surface">
              <a
                className="px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors text-primary font-semibold"
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                className="px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors"
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                className="px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors"
                href="#recipes"
                onClick={() => setMobileMenuOpen(false)}
              >
                Recipes
              </a>
              <a
                className="px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors"
                href="#support"
                onClick={() => setMobileMenuOpen(false)}
              >
                Support
              </a>
            </nav>
            <div className="pt-2 border-t border-outline-variant/40 flex flex-col gap-2">
              <button
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-lg text-title-sm font-semibold shadow-sm"
                onClick={() => closeMenuAnd(onGetStarted)}
                type="button"
              >
                <span>Get Started Free</span>
                <Icon name="arrow_forward" className="text-[16px]" />
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative pt-8 sm:pt-14 pb-12 sm:pb-16 overflow-hidden">
          {/* Warm radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 22%, rgba(243,235,222,0.7) 0%, rgba(252,250,246,0) 70%)' }}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            {/* AI badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-tertiary-fixed border border-outline-variant/40 text-primary text-[12px] sm:text-label-sm font-semibold tracking-wide mb-5 sm:mb-7 shadow-sm">
              <Icon name="auto_awesome" className="text-[13px] sm:text-[14px]" />
              <span>AI-Powered Kitchen &amp; Pantry Management</span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-primary tracking-tight leading-tight sm:leading-[1.15] mb-3">
              Never let fresh ingredients go to<br className="hidden sm:inline" /> waste again.
            </h1>

            {/* Terracotta subhead */}
            <p className="text-base sm:text-lg md:text-xl font-bold text-secondary tracking-tight mb-4 sm:mb-5">
              Smart pantry tracking made effortless.
            </p>

            {/* Paragraph */}
            <p className="max-w-2xl mx-auto text-body-sm sm:text-body-md md:text-base text-on-surface-variant leading-relaxed mb-6 sm:mb-8">
              PantryPal quietly logs groceries via smart scan, alerts you 48 hours before items spoil, and pairs live shelf
              ingredients with chef-curated meals. Save an average of{' '}
              <strong className="text-on-surface font-bold">$1,200 every year</strong> while bringing calm mindfulness to dinner.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-3.5 mb-7 sm:mb-8">
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-title-sm shadow-md hover:shadow-lg transition-all"
                onClick={onGetStarted}
                type="button"
              >
                <Icon name="calendar_month" className="text-[18px]" />
                <span>Start Free 14-Day Trial</span>
              </button>
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-primary font-semibold text-title-sm transition-colors"
                onClick={onGetStarted}
                type="button"
              >
                <Icon name="play_arrow" className="text-[18px] text-secondary" />
                <span>Watch 2-Min Interactive Demo</span>
              </button>
            </div>

            {/* Social proof */}
            <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-body-sm md:text-sm text-on-surface-variant pt-1">
              <div className="flex -space-x-1.5 items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100 text-blue-800 border-2 border-background font-bold text-[9px] sm:text-[10px]">MC</span>
                <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-100 text-amber-800 border-2 border-background font-bold text-[9px] sm:text-[10px]">SL</span>
                <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-100 text-rose-800 border-2 border-background font-bold text-[9px] sm:text-[10px]">ER</span>
                <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-on-primary border-2 border-background font-bold text-[8px] sm:text-[9px]">+15k</span>
              </div>
              <div className="flex items-center text-amber-500 gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" className="text-[15px] sm:text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }} />
                ))}
              </div>
              <span className="font-bold text-on-surface">4.9/5</span>
              <span className="text-outline hidden xs:inline">Loved by 15,000+ mindful home cooks and family chefs</span>
            </div>
          </div>
        </section>

        {/* App showcase frame */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
          <div className="relative bg-surface/70 rounded-2xl p-2.5 sm:p-3 border border-outline-variant/60 shadow-xl backdrop-blur-sm">
            <div
              className="rounded-xl w-full h-auto min-h-[380px] sm:h-[420px] relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 border border-outline-variant/40"
              style={{ background: 'linear-gradient(180deg, #F5F3ED 0%, #E9E5DD 100%)' }}
            >
              {/* Top row */}
              <div className="flex items-center justify-between w-full z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/80 backdrop-blur-md border border-outline-variant/50 text-xs sm:text-body-sm font-medium text-on-surface shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Inventory Sync</span>
                </div>
                <span className="text-xs sm:text-body-sm text-outline italic hidden sm:inline-block select-none">
                  Mindfully organized rustic kitchen pantry
                </span>
              </div>

              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <Icon name="inventory_2" className="text-[140px] sm:text-[180px] text-outline" />
              </div>

              {/* Floating card: Smart Expiry Radar */}
              <div className="relative sm:absolute top-0 right-0 sm:top-4 sm:right-4 md:-top-4 md:-right-4 z-20 w-full sm:w-72 bg-surface rounded-xl p-3.5 sm:p-4 shadow-xl border border-outline-variant/50 my-3 sm:my-0">
                <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-outline-variant/30">
                  <div className="flex items-center gap-1.5 text-xs sm:text-body-sm font-bold text-on-surface">
                    <Icon name="schedule" className="text-[15px] sm:text-[16px] text-secondary" />
                    <span>Smart Expiry Radar</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">2 Urgencies</span>
                </div>
                <div className="space-y-2 py-2.5 sm:py-3">
                  <div className="flex items-center justify-between text-xs sm:text-body-sm">
                    <span className="font-medium text-on-surface">Organic Greek Yogurt</span>
                    <span className="px-2 py-0.5 rounded bg-rose-100/70 text-rose-700 font-semibold text-[10px]">Tomorrow</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-body-sm">
                    <span className="font-medium text-on-surface">Baby Spinach (200g)</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100/80 text-amber-800 font-semibold text-[10px]">in 2 days</span>
                  </div>
                </div>
                <button
                  className="w-full mt-1 py-1.5 px-3 rounded-lg bg-tertiary-fixed hover:bg-primary-container hover:text-on-primary text-primary text-xs sm:text-body-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  type="button"
                  onClick={onGetStarted}
                >
                  <Icon name="search" className="text-[14px]" />
                  <span>Find Recipe with These</span>
                </button>
              </div>

              {/* Bottom cards */}
              <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 z-10 mt-2 sm:mt-0">
                <div className="bg-surface/95 backdrop-blur-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-outline-variant/50 shadow-lg flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Icon name="savings" className="text-[18px]" />
                  </span>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-body-sm font-bold text-on-surface">+$140 saved</span>
                      <span className="text-[10px] px-1.5 rounded bg-surface-container text-on-surface-variant font-medium">this month</span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-outline font-medium">94% pantry efficiency score</div>
                  </div>
                </div>

                <div
                  className="bg-surface/95 backdrop-blur-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-outline-variant/50 shadow-lg flex items-center gap-3 cursor-pointer hover:bg-surface-container-low transition-colors"
                  onClick={onGetStarted}
                >
                  <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Icon name="restaurant" className="text-[18px]" />
                  </span>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-xs sm:text-body-sm font-bold text-on-surface truncate">Dinner ready: Creamy Spinach &amp; Lentil Dahl</div>
                    <div className="text-[10px] sm:text-[11px] text-outline truncate">Uses 4 items expiring this week</div>
                  </div>
                  <Icon name="chevron_right" className="text-[18px] text-outline ml-1 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section id="features" className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/60 shadow-sm hover:shadow-md transition-shadow">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 sm:mb-4 ${f.iconWrap}`}>
                  <Icon name={f.icon} className="text-[20px]" />
                </span>
                <h3 className="text-title-sm font-title-sm font-bold text-on-surface mb-1.5 sm:mb-2">{f.title}</h3>
                <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/50 bg-background py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-body-sm text-outline text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary text-title-sm">PantryPal</span>
            <span>© 2026 Pantry Pal Technologies. All rights reserved.</span>
          </div>
          <nav className="flex flex-wrap justify-center sm:justify-end items-center gap-4 sm:gap-6 font-medium">
            <a className="hover:text-on-surface transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-on-surface transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-on-surface transition-colors" href="#">Security</a>
            <a className="hover:text-on-surface transition-colors" href="#">Help Center</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
