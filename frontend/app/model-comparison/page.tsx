import { ModulePage } from '../../components/ModulePage';

export default function ModelComparisonPage() {
  return <ModulePage eyebrow="Model evaluation" title="Model comparison" description="Compare forecast accuracy, peak timing, training duration, inference speed, and confidence across model families." cards={[{ label: 'Models compared', value: '4', detail: 'Current registry', tone: 'blue' }, { label: 'Top accuracy', value: '94.2%', detail: 'XGBoost baseline', tone: 'green' }, { label: 'Peak error', value: '2.8%', detail: 'Best validation run', tone: 'amber' }, { label: 'Research status', value: 'Ready', detail: 'Exportable results', tone: 'slate' }]} sectionTitle="Evaluation matrix" sectionDescription="A consistent evaluation matrix will make baseline and advanced model results easy to compare and export." actionLabel="Open research" actionHref="/research" />;
}
