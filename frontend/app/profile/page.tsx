import { ModulePage } from '../../components/ModulePage';

export default function ProfilePage() {
  return <ModulePage eyebrow="Account" title="Operator profile" description="Review your role, workspace access, notification preferences, and recent activity." cards={[{ label: 'Role', value: 'Operator', detail: 'Grid operations access', tone: 'blue' }, { label: 'Workspace', value: 'Delhi', detail: 'Primary power grid', tone: 'green' }, { label: 'Alerts', value: 'Enabled', detail: 'Peak and service events', tone: 'amber' }, { label: 'Last active', value: 'Now', detail: 'Current session', tone: 'slate' }]} sectionTitle="Account details" sectionDescription="Profile settings will connect identity, role, notification preferences, and audit activity in the authentication phase." actionLabel="Open settings" actionHref="/settings" />;
}
