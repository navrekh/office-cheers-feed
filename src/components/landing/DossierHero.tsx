export function DossierHero() {
  return (
    <section
      className="relative bg-[#e3dac9] text-stone-900 px-5 py-4 md:px-6 md:py-4 shadow-[0_25px_50px_-15px_rgba(0,0,0,0.85)] border-b-4 border-r-4 border-stone-400/80 -rotate-[0.4deg]"
      style={{ fontFamily: "'Special Elite', 'Courier Prime', monospace" }}
    >
      <div className="pointer-events-none absolute -left-1 top-0 bottom-0 w-1 bg-black/5" />
      <div className="absolute -top-2 left-6 w-3.5 h-3.5 rounded-full bg-red-600 shadow-inner ring-2 ring-red-900" />
      <div className="absolute -top-2 right-6 w-3.5 h-3.5 rounded-full bg-red-600 shadow-inner ring-2 ring-red-900" />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="border-[3px] border-red-800/80 px-2 py-1 -rotate-3 shrink-0">
            <div className="text-xl md:text-2xl font-bold text-red-800 uppercase tracking-tighter mix-blend-multiply leading-none">
              DrinkedIn
            </div>
          </div>
          <h2
            className="text-base md:text-lg font-bold text-stone-900 uppercase leading-tight min-w-0"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            Quit posing. <span className="text-red-800">Start posting.</span>
          </h2>
        </div>
        <div
          className="text-stone-500 text-[9px] text-right leading-tight uppercase shrink-0"
          style={{ fontFamily: "'Courier Prime', monospace" }}
        >
          STATUS: UNEMPLOYABLE · ANON
          <br />
          CLEARANCE: BREAKROOM
        </div>
      </div>
    </section>
  );
}

export default DossierHero;
