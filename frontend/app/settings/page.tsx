import { AdvancedWorkspace } from '../../components/AdvancedWorkspace';
import { ModulePage } from '../../components/ModulePage';

export default function SettingsPage() {
  return <ModulePage eyebrow="Configuration" title="Settings" description="Define workspace preferences for forecasting, alerts, reports, and operator display settings." cards={[]} sectionTitle="Workspace configuration" sectionDescription="Application preferences are persisted through protected system-setting APIs and restricted to Super Admins." actionLabel="Open admin panel" actionHref="/admin"><AdvancedWorkspace kind="settings" /></ModulePage>;
}
