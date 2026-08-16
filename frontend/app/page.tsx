import Link from 'next/link';

const featureCards = [
  { title: 'Demand forecasting', description: 'Plan hourly load with clear confidence and peak timing signals.' },
  { title: 'Explainable intelligence', description: 'Understand which weather, calendar, and historical features influence each prediction.' },
  { title: 'Operational action', description: 'Turn peak-risk signals into commercial load and power purchase recommendations.' }
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <nav className="landing-navigation" aria-label="Main navigation">
        <Link className="landing-brand" href="/"><span className="brand-mark">GS</span><span><strong>GridSense AI</strong><small>Delhi power grid intelligence</small></span></Link>
        <div className="landing-links"><a href="#features">Features</a><a href="#architecture">Architecture</a><a href="#research">Research</a><Link href="/dashboard">Login</Link></div>
      </nav>
      <section className="landing-hero">
        <div className="hero-copy"><p className="eyebrow">AI-powered smart grid decision support</p><h1>See tomorrow’s demand before the grid feels it.</h1><p className="hero-description">GridSense AI combines load history, weather, calendar context, and explainable forecasting to help Delhi power operators plan with confidence.</p><div className="hero-actions"><Link className="primary-button" href="/dashboard">Explore dashboard</Link><a className="secondary-button" href="#contact">Request a demo</a><a className="secondary-button" href="/gridsense-ai-development-plan.pdf" download="gridsense-ai-development-plan.pdf">Download plan</a></div><div className="hero-proof"><span className="status-indicator" /><span>Forecast workspace ready for Phase 1</span></div></div>
        <div className="hero-visual" aria-label="Demand forecast preview"><div className="visual-header"><span>Tomorrow demand outlook</span><strong>+4.8%</strong></div><div className="forecast-bars"><span className="bar-38" /><span className="bar-52" /><span className="bar-46" /><span className="bar-70" /><span className="bar-61" /><span className="peak-bar bar-92" /><span className="bar-76" /><span className="bar-58" /></div><div className="visual-footer"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div>
      </section>
      <section className="feature-section" id="features"><div className="section-intro"><p className="eyebrow">One operational view</p><h2>From prediction to power-system action.</h2></div><div className="feature-grid">{featureCards.map((feature) => <article className="feature-card" key={feature.title}><span className="feature-marker">GS</span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div></section>
      <section className="architecture-section" id="architecture"><div><p className="eyebrow">Built for grid teams</p><h2>Every signal has a reason and a next step.</h2></div><p>Operators get a focused dashboard, analysts get reproducible model comparisons, and administrators get a clear foundation for secure data and model operations.</p></section>
      <section className="research-section" id="research"><p className="eyebrow">Research-ready by design</p><h2>Move from an experiment to a decision system.</h2><Link className="text-link" href="/research">View research workspace <span>→</span></Link></section>
      <footer className="landing-footer" id="contact"><span>GridSense AI</span><span>Intelligent electricity demand forecasting for Delhi</span></footer>
    </main>
  );
}
