import { ModulePage } from '../../components/ModulePage';
import { OperationsWorkspace } from '../../components/OperationsWorkspace';

export default function AlertsPage() {
  return <ModulePage eyebrow="Operator attention" title="Alerts" description="Review high-demand warnings, forecast deviation, low-confidence outputs, and data-quality signals." cards={[]} sectionTitle="Alert history" sectionDescription="Filter alerts by acknowledgement state and acknowledge operational signals from the protected API." actionLabel="Open dashboard" actionHref="/dashboard"><OperationsWorkspace kind="alerts" /></ModulePage>;
}
