import { ModulePage } from '../../components/ModulePage';

export default function ModelTrainingPage() {
  return <ModulePage eyebrow="AI development" title="Model training" description="Configure a reproducible training run using a validated dataset, forecast horizon, feature set, and model family." cards={[{ label: 'Training runs', value: '18', detail: 'Workspace history', tone: 'blue' }, { label: 'Best model', value: '94.2%', detail: 'Validation accuracy', tone: 'green' }, { label: 'Latest run', value: 'Complete', detail: 'XGBoost baseline', tone: 'amber' }, { label: 'Next model', value: 'LSTM', detail: 'Ready to configure', tone: 'slate' }]} sectionTitle="Training configuration" sectionDescription="The training workflow will capture dataset version, features, hyperparameters, progress, metrics, and deployable artifacts." actionLabel="Compare models" actionHref="/model-comparison" />;
}
