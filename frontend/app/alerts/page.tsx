import { ModulePage } from '../../components/ModulePage';

export default function AlertsPage() {
  return <ModulePage eyebrow="Operator attention" title="Alerts" description="Review high-demand warnings, forecast deviation, low-confidence outputs, and data-quality signals." cards={[{ label: 'Open alerts', value: '3', detail: 'Require operator review', tone: 'amber' }, { label: 'Critical', value: '1', detail: 'Peak risk today', tone: 'blue' }, { label: 'Acknowledged', value: '8', detail: 'Last 24 hours', tone: 'green' }, { label: 'Service status', value: 'Online', detail: 'All forecast services', tone: 'slate' }]} sectionTitle="Alert history" sectionDescription="Alerts will be filterable by severity, type, status, and time while preserving an acknowledgement history." actionLabel="Open dashboard" actionHref="/dashboard" />;
}
