import { ModulePage } from '../../components/ModulePage';

export default function PeakPredictionPage() {
  return <ModulePage eyebrow="Peak intelligence" title="Peak prediction" description="Identify the next critical demand window before it becomes an operational constraint." cards={[{ label: "Today's peak", value: '7,210 MW', detail: 'Observed and confirmed', tone: 'blue' }, { label: "Tomorrow's peak", value: '7,460 MW', detail: 'Forecast magnitude', tone: 'amber' }, { label: 'Peak timing', value: '15:00', detail: 'Expected local time', tone: 'green' }, { label: 'Probability', value: '82%', detail: 'High confidence window', tone: 'slate' }]} sectionTitle="Peak risk timeline" sectionDescription="Peak duration, timing, probability, and historical comparison will be shown here for operator review." actionLabel="View alerts" actionHref="/alerts" />;
}
