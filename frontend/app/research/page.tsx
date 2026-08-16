import { ModulePage } from '../../components/ModulePage';

export default function ResearchPage() {
  return <ModulePage eyebrow="Research workspace" title="Research" description="Organize datasets, experiments, model comparisons, and reproducibility metadata for publication-ready analysis." cards={[{ label: 'Experiments', value: '18', detail: 'Tracked runs', tone: 'blue' }, { label: 'Datasets', value: '6', detail: 'Versioned sources', tone: 'green' }, { label: 'Best MAPE', value: '5.8%', detail: 'Validation result', tone: 'amber' }, { label: 'Exports', value: '9', detail: 'Available results', tone: 'slate' }]} sectionTitle="Experiment history" sectionDescription="Research results will connect each experiment to its dataset, features, model version, metrics, and export record." actionLabel="Compare models" actionHref="/model-comparison" />;
}
