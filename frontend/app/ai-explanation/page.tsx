import { AdvancedWorkspace } from '../../components/AdvancedWorkspace';
import { ModulePage } from '../../components/ModulePage';

export default function AIExplanationPage() {
  return <ModulePage eyebrow="Explainable AI" title="Why the model predicts this" description="Trace each forecast to the recent load, trend, uncertainty, and model signals that shaped the result." cards={[]} sectionTitle="Feature importance" sectionDescription="Generate a per-forecast explanation with deterministic feature contributions and a natural-language summary." actionLabel="Open forecast" actionHref="/forecast"><AdvancedWorkspace kind="explanation" /></ModulePage>;
}
