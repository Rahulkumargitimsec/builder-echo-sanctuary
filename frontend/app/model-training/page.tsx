import { ModulePage } from '../../components/ModulePage';
import { OperationsWorkspace } from '../../components/OperationsWorkspace';

export default function ModelTrainingPage() {
  return <ModulePage eyebrow="AI development" title="Model training" description="Configure a reproducible training run using a validated dataset, forecast horizon, feature set, and model family." cards={[]} sectionTitle="Training configuration" sectionDescription="Start a deterministic baseline run and capture the model, metrics, dataset size, and status in the model registry." actionLabel="Compare models" actionHref="/model-comparison"><OperationsWorkspace kind="training" /></ModulePage>;
}
