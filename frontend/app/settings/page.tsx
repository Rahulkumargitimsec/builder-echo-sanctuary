import { ModulePage } from '../../components/ModulePage';

export default function SettingsPage() {
  return <ModulePage eyebrow="Configuration" title="Settings" description="Define workspace preferences for forecasting, alerts, reports, and operator display settings." cards={[{ label: 'Forecast timezone', value: 'IST', detail: 'Asia/Kolkata', tone: 'blue' }, { label: 'Default horizon', value: '24 hours', detail: 'Forecast workspace', tone: 'green' }, { label: 'Alert threshold', value: 'High', detail: 'Peak risk level', tone: 'amber' }, { label: 'Report schedule', value: '3 active', detail: 'Recurring exports', tone: 'slate' }]} sectionTitle="Workspace configuration" sectionDescription="Application preferences will be persisted per workspace and protected by role-based access controls." actionLabel="Open admin panel" actionHref="/admin" />;
}
