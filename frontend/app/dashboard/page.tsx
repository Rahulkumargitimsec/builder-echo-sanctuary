import { ModulePage } from '../../components/ModulePage';

export default function DashboardPage() {
  return <ModulePage eyebrow="Operations overview" title="Grid operations dashboard" description="Monitor the current grid position, tomorrow's expected demand, and the signals that need operator attention." cards={[{ label: 'Current load', value: '5,842 MW', detail: 'Live operating view', tone: 'blue' }, { label: "Today's peak", value: '7,210 MW', detail: 'Expected at 14:30', tone: 'amber' }, { label: "Tomorrow's peak", value: '7,460 MW', detail: '86% confidence', tone: 'green' }, { label: 'Accuracy', value: '94.2%', detail: 'Last 30 days', tone: 'slate' }]} sectionTitle="Demand overview" sectionDescription="The dashboard will combine hourly, weekly, monthly, and yearly demand signals with active alerts and recommendations." actionLabel="Open forecast" actionHref="/forecast" />;
}
