import { ModulePage } from '../../components/ModulePage';

export default function AnalyticsPage() {
  return <ModulePage eyebrow="Grid intelligence" title="Analytics" description="Compare demand patterns across hourly, weekly, monthly, and yearly operating views." cards={[{ label: 'Hourly view', value: '24 points', detail: 'Selected day', tone: 'blue' }, { label: 'Weekly trend', value: '+3.7%', detail: 'Versus prior week', tone: 'green' }, { label: 'Peak history', value: '12 events', detail: 'Current month', tone: 'amber' }, { label: 'Data coverage', value: '98.6%', detail: 'Validated records', tone: 'slate' }]} sectionTitle="Demand patterns" sectionDescription="Interactive demand charts will share filters with forecast and peak views for consistent operational analysis." actionLabel="View reports" actionHref="/reports" />;
}
