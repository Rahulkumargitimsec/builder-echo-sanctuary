import { ModulePage } from '../../components/ModulePage';

export default function ReportsPage() {
  return <ModulePage eyebrow="Operational reporting" title="Reports" description="Generate decision-ready demand, peak, model performance, savings, and data-quality reports." cards={[{ label: 'Reports generated', value: '24', detail: 'This workspace', tone: 'blue' }, { label: 'Latest report', value: 'Today', detail: 'Daily demand summary', tone: 'green' }, { label: 'Export formats', value: '4', detail: 'PDF, CSV, Excel, JSON', tone: 'amber' }, { label: 'Scheduled', value: '3', detail: 'Recurring reports', tone: 'slate' }]} sectionTitle="Report library" sectionDescription="Reports will preserve filters, generation time, author, data range, and export format for reliable operational sharing." actionLabel="View analytics" actionHref="/analytics" />;
}
