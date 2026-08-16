import { ModulePage } from '../../components/ModulePage';

export default function AdminPage() {
  return <ModulePage eyebrow="Administration" title="Admin panel" description="Manage users, roles, dataset access, model deployment, settings, and system logs." cards={[{ label: 'Active users', value: '12', detail: 'Across all roles', tone: 'blue' }, { label: 'Pending actions', value: '2', detail: 'Require admin review', tone: 'amber' }, { label: 'Models deployed', value: '3', detail: 'Available to operators', tone: 'green' }, { label: 'System logs', value: 'Healthy', detail: 'No critical errors', tone: 'slate' }]} sectionTitle="Administration controls" sectionDescription="The admin workspace will centralize RBAC, deployment approvals, system settings, audit logs, and training logs." actionLabel="Review settings" actionHref="/settings" />;
}
