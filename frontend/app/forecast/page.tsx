import { ModulePage } from '../../components/ModulePage';

export default function ForecastPage() {
  return <ModulePage eyebrow="Forecasting" title="Hourly demand forecast" description="Select a forecast range and model to understand expected load, peak magnitude, peak timing, and confidence." cards={[{ label: 'Forecast horizon', value: '24 hours', detail: 'Next available window', tone: 'blue' }, { label: 'Expected peak', value: '7,460 MW', detail: 'Tomorrow at 15:00', tone: 'amber' }, { label: 'Confidence', value: '86%', detail: 'Current model output', tone: 'green' }, { label: 'Model', value: 'XGBoost', detail: 'Selected baseline', tone: 'slate' }]} sectionTitle="Forecast workspace" sectionDescription="Date, forecast range, and model selection will drive the hourly demand graph and exportable forecast table." actionLabel="Compare models" actionHref="/model-comparison" />;
}
