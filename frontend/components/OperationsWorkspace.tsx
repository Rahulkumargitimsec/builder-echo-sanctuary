'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';

type WorkspaceKind = 'dashboard' | 'forecast' | 'peak' | 'alerts' | 'training' | 'comparison';
type ForecastPoint = { forecast_for: string; demand_mw: number; confidence: number };
type ForecastData = { model_name: string; horizon: number; forecasts: ForecastPoint[]; metrics: Record<string, number>; data_points: number; last_observed_at: string; last_observed_demand_mw: number; used_fallback: boolean; cadence_minutes: number };
type SummaryData = { model_name: string; next_forecast: ForecastPoint; metrics: Record<string, number>; data_points: number; last_observed_at: string; last_observed_demand_mw: number; used_fallback: boolean };
type PeakData = { model_name: string; peak_for: string; peak_demand_mw: number; horizon: number; confidence: number; metrics: Record<string, number>; used_fallback: boolean };
type Alert = { id: number; title: string; severity: string; message: string; acknowledged: boolean; created_at: string };
type Comparison = { model_name: string; metrics: Record<string, number>; forecast_demand_mw: number };
type ModelRun = { id: number; model_name: string; algorithm: string; status: string; metrics: Record<string, number>; data_points: number; trained_at: string; created_by: string };

const modelOptions = ['weighted_ensemble', 'persistence', 'moving_average', 'trend'];

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) } });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'The workspace request failed.');
  }
  return response.json() as Promise<T>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function MetricCards({ cards }: { cards: { label: string; value: string; detail: string; tone: string }[] }) {
  return <div className="metric-grid">{cards.map((card) => <article className={`metric-card metric-card-${card.tone}`} key={card.label}><p>{card.label}</p><strong>{card.value}</strong><span>{card.detail}</span></article>)}</div>;
}

function WorkspaceState({ error, loading }: { error: string; loading: boolean }) {
  if (loading) return <div className="workspace-state" role="status">Loading live workspace data...</div>;
  if (error) return <div className="workspace-state workspace-state-error" role="alert">{error}</div>;
  return null;
}

function DashboardWorkspace({ accessToken }: { accessToken: string }) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [peak, setPeak] = useState<PeakData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request<SummaryData>('/api/v1/forecast/summary', accessToken),
      request<PeakData>('/api/v1/peak-prediction', accessToken),
      request<Alert[]>('/api/v1/alerts?acknowledged=false', accessToken)
    ]).then(([summaryResponse, peakResponse, alertsResponse]) => {
      setSummary(summaryResponse);
      setPeak(peakResponse);
      setAlerts(alertsResponse);
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard data.')).finally(() => setLoading(false));
  }, [accessToken]);

  return <>
    <WorkspaceState error={error} loading={loading} />
    {summary && peak && <>
      <MetricCards cards={[{ label: 'Current load', value: `${summary.last_observed_demand_mw.toFixed(1)} MW`, detail: 'Latest validated observation', tone: 'blue' }, { label: 'Next forecast', value: `${summary.next_forecast.demand_mw.toFixed(1)} MW`, detail: formatDate(summary.next_forecast.forecast_for), tone: 'green' }, { label: 'Expected peak', value: `${peak.peak_demand_mw.toFixed(1)} MW`, detail: formatDate(peak.peak_for), tone: 'amber' }, { label: 'Confidence', value: `${Math.round(peak.confidence * 100)}%`, detail: `${summary.model_name.replace('_', ' ')} model`, tone: 'slate' }]} />
      <div className="operations-grid"><section className="data-table-panel"><div className="panel-heading"><div><h2>Forecast health</h2><p>{summary.data_points} observations used for this output.</p></div><span className="panel-badge">{summary.used_fallback ? 'Demo series' : 'Imported data'}</span></div><div className="forecast-health-list"><span><strong>MAE</strong>{summary.metrics.mae?.toFixed(2)} MW</span><span><strong>RMSE</strong>{summary.metrics.rmse?.toFixed(2)} MW</span><span><strong>MAPE</strong>{summary.metrics.mape?.toFixed(2)}%</span><span><strong>Peak error</strong>{summary.metrics.peak_magnitude_error_mw?.toFixed(2)} MW</span></div></section><section className="data-table-panel"><div className="panel-heading"><div><h2>Open alerts</h2><p>Signals requiring operator review.</p></div><span className="alert-count">{alerts.length}</span></div>{alerts.length === 0 ? <p className="workspace-muted">No open alerts.</p> : <div className="alert-preview-list">{alerts.slice(0, 3).map((alert) => <div className="alert-preview-item" key={alert.id}><span className={`severity-dot severity-${alert.severity}`} /><div><strong>{alert.title}</strong><p>{alert.message}</p></div></div>)}</div>}</section></div>
    </>}
  </>;
}

function ForecastWorkspace({ accessToken }: { accessToken: string }) {
  const [model, setModel] = useState('weighted_ensemble');
  const [horizon, setHorizon] = useState(24);
  const [data, setData] = useState<ForecastData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const maxDemand = useMemo(() => data ? Math.max(...data.forecasts.map((point) => point.demand_mw)) : 0, [data]);

  const loadForecast = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await request<ForecastData>(`/api/v1/forecast/horizon?horizon=${horizon}&model_name=${model}`, accessToken));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load forecast.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadForecast(); }, [accessToken]);

  const exportForecast = () => {
    if (!data) return;
    const csv = ['forecast_for,demand_mw,confidence', ...data.forecasts.map((point) => `${point.forecast_for},${point.demand_mw},${point.confidence}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `gridsense-${model}-forecast.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <>
    <div className="workspace-toolbar"><label>Model<select value={model} onChange={(event) => setModel(event.target.value)}>{modelOptions.map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}</select></label><label>Horizon<select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button className="secondary-button" type="button" onClick={() => void loadForecast()}>Refresh forecast</button><button className="primary-button" type="button" onClick={exportForecast} disabled={!data}>Export CSV</button></div>
    <WorkspaceState error={error} loading={loading} />
    {data && <><MetricCards cards={[{ label: 'Forecast horizon', value: `${data.horizon} hours`, detail: `${data.cadence_minutes}-minute cadence`, tone: 'blue' }, { label: 'Expected peak', value: `${maxDemand.toFixed(1)} MW`, detail: 'Within selected horizon', tone: 'amber' }, { label: 'Confidence', value: `${Math.round((data.forecasts[0]?.confidence || 0) * 100)}%`, detail: 'Current model output', tone: 'green' }, { label: 'Model', value: data.model_name.replace('_', ' '), detail: data.used_fallback ? 'Demo series' : 'Imported data', tone: 'slate' }]} /><div className="data-table-panel"><div className="panel-heading"><div><h2>Hourly demand projection</h2><p>Confidence and demand values for every forecast point.</p></div><span className="panel-badge">{data.data_points} observations</span></div><div className="forecast-table-wrap"><table className="forecast-table"><thead><tr><th>Time</th><th>Demand</th><th>Confidence</th><th>Relative load</th></tr></thead><tbody>{data.forecasts.map((point) => <tr key={point.forecast_for}><td>{formatDate(point.forecast_for)}</td><td><strong>{point.demand_mw.toFixed(1)} MW</strong></td><td>{Math.round(point.confidence * 100)}%</td><td><meter min="0" max={maxDemand} value={point.demand_mw} /></td></tr>)}</tbody></table></div></div></>}
  </>;
}

function PeakWorkspace({ accessToken }: { accessToken: string }) {
  const [data, setData] = useState<PeakData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { request<PeakData>('/api/v1/peak-prediction', accessToken).then(setData).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load peak prediction.')); }, [accessToken]);
  return <><WorkspaceState error={error} loading={!data && !error} />{data && <><MetricCards cards={[{ label: 'Predicted peak', value: `${data.peak_demand_mw.toFixed(1)} MW`, detail: 'Highest forecast point', tone: 'amber' }, { label: 'Peak timing', value: new Date(data.peak_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), detail: new Date(data.peak_for).toLocaleDateString(), tone: 'blue' }, { label: 'Probability', value: `${Math.round(data.confidence * 100)}%`, detail: `${data.horizon}-hour horizon`, tone: 'green' }, { label: 'Magnitude error', value: `${data.metrics.peak_magnitude_error_mw?.toFixed(1)} MW`, detail: data.model_name.replace('_', ' '), tone: 'slate' }]} /><div className="data-table-panel"><div className="panel-heading"><div><h2>Peak risk assessment</h2><p>Use timing, magnitude, and confidence together before taking action.</p></div><span className="panel-badge">{data.confidence >= 0.8 ? 'High confidence' : 'Review confidence'}</span></div><div className="peak-assessment"><div><strong>{data.metrics.peak_timing_error_hours?.toFixed(1)} hours</strong><span>Backtest timing error</span></div><div><strong>{data.used_fallback ? 'Demo data' : 'Validated data'}</strong><span>Source status</span></div><div><strong>{data.model_name.replace('_', ' ')}</strong><span>Selected model</span></div></div></div></>}</>;
}

function AlertsWorkspace({ accessToken }: { accessToken: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const loadAlerts = async () => {
    try { setAlerts(await request<Alert[]>(`/api/v1/alerts?acknowledged=${showAcknowledged}`, accessToken)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load alerts.'); }
  };
  useEffect(() => { void loadAlerts(); }, [accessToken, showAcknowledged]);
  const acknowledge = async (id: number) => { await request<Alert>(`/api/v1/alerts/${id}/acknowledge`, accessToken, { method: 'POST' }); await loadAlerts(); };
  return <><div className="workspace-toolbar"><label>Status<select value={showAcknowledged ? 'acknowledged' : 'open'} onChange={(event) => setShowAcknowledged(event.target.value === 'acknowledged')}><option value="open">Open alerts</option><option value="acknowledged">Acknowledged</option></select></label><button className="secondary-button" type="button" onClick={() => void loadAlerts()}>Refresh alerts</button></div><WorkspaceState error={error} loading={!alerts.length && !error} /><MetricCards cards={[{ label: 'Open alerts', value: `${alerts.filter((alert) => !alert.acknowledged).length}`, detail: 'Current filter', tone: 'amber' }, { label: 'Critical', value: `${alerts.filter((alert) => alert.severity === 'critical').length}`, detail: 'Peak risk signals', tone: 'blue' }, { label: 'Acknowledged', value: `${alerts.filter((alert) => alert.acknowledged).length}`, detail: 'In current filter', tone: 'green' }, { label: 'Service status', value: 'Online', detail: 'Alert service', tone: 'slate' }]} /><div className="alert-list">{alerts.map((alert) => <article className={`alert-card severity-card-${alert.severity}`} key={alert.id}><div className="alert-card-heading"><span className={`severity-dot severity-${alert.severity}`} /><div><h3>{alert.title}</h3><p>{formatDate(alert.created_at)}</p></div><span className="alert-severity-label">{alert.severity}</span></div><p className="alert-card-message">{alert.message}</p>{!alert.acknowledged && <button className="secondary-button" type="button" onClick={() => void acknowledge(alert.id)}>Acknowledge</button>}</article>)}</div></>;
}

function ModelWorkspace({ accessToken, comparison }: { accessToken: string; comparison: boolean }) {
  const [model, setModel] = useState('weighted_ensemble');
  const [models, setModels] = useState<Comparison[]>([]);
  const [run, setRun] = useState<ModelRun | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loadComparison = async () => { setLoading(true); try { const data = await request<{ models: Comparison[] }>('/api/v1/models/comparison', accessToken); setModels(data.models); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load model comparison.'); } finally { setLoading(false); } };
  useEffect(() => { if (comparison) void loadComparison(); }, [accessToken, comparison]);
  const train = async () => { setLoading(true); setError(''); try { setRun(await request<ModelRun>('/api/v1/models/train', accessToken, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model_name: model }) })); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to train model.'); } finally { setLoading(false); } };
  return <><div className="workspace-toolbar"><label>Model<select value={model} onChange={(event) => setModel(event.target.value)}>{modelOptions.map((option) => <option key={option} value={option}>{option.replace('_', ' ')}</option>)}</select></label>{!comparison && <button className="primary-button" type="button" onClick={() => void train()} disabled={loading}>{loading ? 'Training...' : 'Start training run'}</button>}{comparison && <button className="secondary-button" type="button" onClick={() => void loadComparison()} disabled={loading}>Refresh comparison</button>}</div><WorkspaceState error={error} loading={loading} />{run && <div className="training-result"><p className="eyebrow">Training complete</p><h3>{run.model_name.replace('_', ' ')} model run #{run.id}</h3><p>{run.data_points} observations evaluated with a {run.metrics.mape?.toFixed(2)}% MAPE.</p></div>}{comparison && <div className="data-table-panel"><div className="panel-heading"><div><h2>Evaluation matrix</h2><p>Compare baseline models on the same historical series.</p></div><span className="panel-badge">{models.length} models</span></div><div className="forecast-table-wrap"><table className="forecast-table"><thead><tr><th>Model</th><th>Forecast</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>Peak error</th></tr></thead><tbody>{models.map((item) => <tr key={item.model_name}><td><strong>{item.model_name.replace('_', ' ')}</strong></td><td>{item.forecast_demand_mw.toFixed(1)} MW</td><td>{item.metrics.mae?.toFixed(2)}</td><td>{item.metrics.rmse?.toFixed(2)}</td><td>{item.metrics.mape?.toFixed(2)}%</td><td>{item.metrics.peak_magnitude_error_mw?.toFixed(2)} MW</td></tr>)}</tbody></table></div></div>}</>;
}

export function OperationsWorkspace({ kind }: { kind: WorkspaceKind }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <div className="workspace-state">Waiting for an authenticated session...</div>;
  if (kind === 'dashboard') return <DashboardWorkspace accessToken={accessToken} />;
  if (kind === 'forecast') return <ForecastWorkspace accessToken={accessToken} />;
  if (kind === 'peak') return <PeakWorkspace accessToken={accessToken} />;
  if (kind === 'alerts') return <AlertsWorkspace accessToken={accessToken} />;
  return <ModelWorkspace accessToken={accessToken} comparison={kind === 'comparison'} />;
}
