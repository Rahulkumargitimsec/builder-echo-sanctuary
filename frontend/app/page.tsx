export default function HomePage() {
  return (
    <main className="application-shell">
      <section className="welcome-panel">
        <p className="eyebrow">GridSense AI</p>
        <h1>Smart grid decision support for Delhi power demand.</h1>
        <p className="intro-copy">The application foundation is ready for forecasting, peak prediction, explainable AI, and operational recommendations.</p>
        <div className="status-row" role="status">
          <span className="status-indicator" />
          Phase 0 workspace initialized
        </div>
      </section>
    </main>
  );
}
