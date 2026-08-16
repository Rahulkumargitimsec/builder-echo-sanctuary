import { ModulePage } from '../../components/ModulePage';

export default function RecommendationsPage() {
  return <ModulePage eyebrow="Decision support" title="Recommendations" description="Turn expected peaks into prioritized commercial load reduction, demand response, and power purchase actions." cards={[{ label: 'Active actions', value: '4', detail: 'Across two peak windows', tone: 'blue' }, { label: 'Expected reduction', value: '118 MW', detail: 'If accepted by operators', tone: 'green' }, { label: 'Potential savings', value: '₹2.4L', detail: 'Estimated daily value', tone: 'amber' }, { label: 'Priority', value: 'High', detail: 'Next action due 14:00', tone: 'slate' }]} sectionTitle="Action queue" sectionDescription="Prioritized recommendations will include an action window, expected savings, confidence, reason, and completion status." actionLabel="Review peak risk" actionHref="/peak-prediction" />;
}
