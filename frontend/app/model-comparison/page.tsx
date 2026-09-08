import { ModulePage } from '../../components/ModulePage';
import { OperationsWorkspace } from '../../components/OperationsWorkspace';

export default function ModelComparisonPage() {
  return <ModulePage eyebrow="Model evaluation" title="Model comparison" description="Compare forecast accuracy, peak timing, training duration, inference speed, and confidence across model families." cards={[]} sectionTitle="Evaluation matrix" sectionDescription="A consistent evaluation matrix compares the baseline models on the same historical series." actionLabel="Open research" actionHref="/research"><OperationsWorkspace kind="comparison" /></ModulePage>;
}
