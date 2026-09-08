import { DatasetWorkspace } from '../../components/DatasetWorkspace';
import { ModulePage } from '../../components/ModulePage';

export default function DatasetsPage() {
  return <ModulePage eyebrow="Data foundation" title="Datasets" description="Manage historical load, weather, calendar, holiday, and festival data used by the forecasting pipeline." cards={[{ label: 'Active datasets', value: '6', detail: 'Current workspace', tone: 'blue' }, { label: 'Data coverage', value: '4.2 years', detail: 'Historical load', tone: 'green' }, { label: 'Quality score', value: '98.6%', detail: 'Latest validation', tone: 'amber' }, { label: 'Last import', value: 'Today', detail: '06:10 IST', tone: 'slate' }]} sectionTitle="Dataset registry" sectionDescription="Upload, preview, validate, version, and review import history before data enters model training." actionLabel="Open training" actionHref="/model-training"><DatasetWorkspace /></ModulePage>;
}
