import { ModulePage } from '../../components/ModulePage';
import { OperationsWorkspace } from '../../components/OperationsWorkspace';

export default function PeakPredictionPage() {
  return <ModulePage eyebrow="Peak intelligence" title="Peak prediction" description="Identify the next critical demand window before it becomes an operational constraint." cards={[]} sectionTitle="Peak risk timeline" sectionDescription="Peak magnitude, timing, probability, and backtest error are calculated from the selected forecast." actionLabel="View alerts" actionHref="/alerts"><OperationsWorkspace kind="peak" /></ModulePage>;
}
