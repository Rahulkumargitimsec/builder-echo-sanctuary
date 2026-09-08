import Link from 'next/link';
import { AppShell } from './AppShell';

type ModuleCard = {
  label: string;
  value: string;
  detail: string;
  tone?: 'blue' | 'green' | 'amber' | 'slate';
};

type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  cards: ModuleCard[];
  sectionTitle: string;
  sectionDescription: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
};

export function ModulePage({ eyebrow, title, description, cards, sectionTitle, sectionDescription, actionLabel, actionHref, children }: ModulePageProps) {
  return (
    <AppShell>
      <div className="module-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="module-title">{title}</h1>
          <p className="module-description">{description}</p>
        </div>
        {actionLabel && actionHref && <Link className="primary-button" href={actionHref}>{actionLabel}</Link>}
      </div>
      {cards.length > 0 && <div className="metric-grid">
        {cards.map((card) => <article className={`metric-card metric-card-${card.tone || 'blue'}`} key={card.label}><p>{card.label}</p><strong>{card.value}</strong><span>{card.detail}</span></article>)}
      </div>}
      <section className="content-panel">
        <div className="panel-heading"><div><h2>{sectionTitle}</h2><p>{sectionDescription}</p></div><span className="panel-badge">Live API view</span></div>
        {children || <div className="empty-state"><span className="empty-state-marker">GS</span><h3>Workspace ready</h3><p>This module has its navigation, layout, and first-screen state in place for the next data integration phase.</p></div>}
      </section>
    </AppShell>
  );
}
