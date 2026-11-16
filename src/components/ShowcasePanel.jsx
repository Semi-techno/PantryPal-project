import Icon from './Icon.jsx';

const filledStar = { fontVariationSettings: "'FILL' 1" };

/**
 * Left column: the warm editorial pantry showcase with floating bento cards.
 */
export default function ShowcasePanel() {
  return (
    <section className="relative flex w-full lg:w-[52%] xl:w-[55%] min-h-[520px] lg:min-h-screen bg-tertiary overflow-hidden items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
      {/* Kitchen hero background */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out hover:scale-105"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1400&q=80')",
        }}
      />

      {/* Vignette gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/30 mix-blend-multiply" />
      <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />

      {/* Floating cards */}
      <div className="relative z-10 w-full h-full max-w-lg flex flex-col justify-between py-4 lg:py-6 gap-6">
        {/* TOP CARD: Expiry Alert */}
        <div className="self-start w-full max-w-sm frosted-glass rounded-xl p-4 shadow-xl transform transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-secondary-container animate-ping" />
              <span className="text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">
                Expiry Alert
              </span>
            </div>
            <span className="text-label-sm font-label-sm font-medium bg-[#FAF0D9] text-[#8F6B12] px-2 py-0.5 rounded-full">
              48h remaining
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {/* Item 1 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#FAF0D9] text-[#8F6B12] flex items-center justify-center">
                  <Icon name="icecream" className="text-[18px]" />
                </div>
                <div>
                  <h4 className="text-title-sm font-title-sm text-on-surface leading-tight">
                    Organic Greek Yogurt
                  </h4>
                  <p className="text-body-sm font-body-sm text-outline">Dairy • 1 tub (500g)</p>
                </div>
              </div>
              <span className="text-label-sm font-label-sm font-medium text-secondary bg-[#FAECE8] px-2 py-0.5 rounded">
                Tomorrow
              </span>
            </div>
            {/* Item 2 */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-tertiary-fixed text-primary flex items-center justify-center">
                  <Icon name="nutrition" className="text-[18px]" />
                </div>
                <div>
                  <h4 className="text-title-sm font-title-sm text-on-surface leading-tight">Baby Spinach</h4>
                  <p className="text-body-sm font-body-sm text-outline">Crisper • 200g bunch</p>
                </div>
              </div>
              <span className="text-label-sm font-label-sm font-medium text-secondary bg-[#FAECE8] px-2 py-0.5 rounded">
                In 2 days
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE CARD: Pantry Health & Savings */}
        <div className="self-end w-full max-w-sm frosted-glass rounded-xl p-4 shadow-xl transform transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-label-sm font-label-sm text-primary uppercase font-bold tracking-wider">
              Pantry Health Index
            </span>
            <span className="inline-flex items-center gap-1 text-label-sm font-label-sm text-primary bg-[#EBF2EE] px-2 py-0.5 rounded-full font-semibold">
              <Icon name="check_circle" className="text-[13px]" />
              Optimal
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress circle */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-outline-variant/40"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-primary-container"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="94, 100"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <span className="absolute text-title-sm font-title-sm text-primary font-bold">94%</span>
            </div>
            <div>
              <p className="text-title-sm font-title-sm text-on-surface">Pantry fully stocked</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                <Icon name="savings" className="text-[16px] text-tertiary" />
                <span>
                  Saved <strong className="text-primary font-semibold">$140</strong> on groceries this month
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM CARD: Chef Testimonial */}
        <div className="w-full bg-primary/95 text-on-primary p-5 rounded-xl border border-primary-fixed/20 shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <Icon name="format_quote" className="text-tertiary-fixed text-[24px] shrink-0 mt-0.5" />
            <div>
              <p className="text-body-md font-body-md text-surface italic leading-relaxed">
                "Pantry Pal transformed our chaotic kitchen cupboards into an organized, zero-waste sanctuary."
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <h5 className="text-title-sm font-title-sm text-surface-bright font-semibold">Chef Maya Lin</h5>
                  <p className="text-body-sm font-body-sm text-on-primary-container">Culinary Stylist &amp; Author</p>
                </div>
                <div className="flex text-[#FAF0D9]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon key={i} name="star" className="text-[16px]" style={filledStar} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
