import { ModulePage } from '../../components/ModulePage';
import { OperationsWorkspace } from '../../components/OperationsWorkspace';

export default function DashboardPage() {
  return <ModulePage eyebrow="Operations overview" title="Grid operations dashboard" description="Monitor the current grid position, tomorrow's expected demand, and the signals that need operator attention." cards={[]} sectionTitle="Demand overview" sectionDescription="Live forecast, peak, alert, and validation signals from the protected operations API." actionLabel="Open forecast" actionHref="/forecast"><OperationsWorkspace kind="dashboard" /></ModulePage>;
}
