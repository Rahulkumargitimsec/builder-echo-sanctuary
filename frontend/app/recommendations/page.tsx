import { AdvancedWorkspace } from '../../components/AdvancedWorkspace';
import { ModulePage } from '../../components/ModulePage';

export default function RecommendationsPage() {
  return <ModulePage eyebrow="Decision support" title="Recommendations" description="Turn expected peaks into prioritized commercial load reduction, demand response, and power purchase actions." cards={[]} sectionTitle="Action queue" sectionDescription="Create, review, and update recommendations with expected reduction, savings, confidence, reason, and status." actionLabel="Review peak risk" actionHref="/peak-prediction"><AdvancedWorkspace kind="recommendations" /></ModulePage>;
}
