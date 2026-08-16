import { ModulePage } from '../../components/ModulePage';

export default function AIExplanationPage() {
  return <ModulePage eyebrow="Explainable AI" title="Why the model predicts this" description="Trace each forecast to the weather, calendar, historical load, and temporal features that shaped the result." cards={[{ label: 'Top feature', value: 'Hour of day', detail: 'Largest current influence', tone: 'blue' }, { label: 'Temperature effect', value: '+8.4%', detail: 'Demand contribution', tone: 'amber' }, { label: 'History effect', value: '+5.1%', detail: 'Previous-day load', tone: 'green' }, { label: 'Explanation status', value: 'Ready', detail: 'SHAP workspace', tone: 'slate' }]} sectionTitle="Feature importance" sectionDescription="Global importance, per-prediction SHAP values, and a natural-language explanation will share the same forecast context." actionLabel="Open forecast" actionHref="/forecast" />;
}
