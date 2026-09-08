'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

type AdvancedKind = 'explanation' | 'recommendations' | 'reports' | 'research' | 'admin' | 'settings';
type Explanation = { model_name: string; forecast_for: string; predicted_demand_mw: number; feature_contributions: Record<string, number>; explanation: string };
type Recommendation = { id: number; category: string; priority: string; action: string; expected_reduction_mw: number | null; expected_savings: number | null; time_window: string; confidence: number; reason: string; status: string };
type Report = { id: number; type: string; format: string; status: string; generated_by: string; created_at: string; content: string };
type Experiment = { id: number; name: string; dataset_version: string | null; parameters: Record<string, string | number | boolean>; status: string; created_at: string; results: { model_name: string; metrics: Record<string, number>; reproducibility: Record<string, string | number | boolean> }[] };
type AdminUser = { id: string; email: string; display_name: string; role: string; is_active: boolean };
type AuditLog = { id: number; actor_id: string | null; action: string; resource_type: string; resource_id: string | null; details: Record<string, unknown>; created_at: string };
type Setting = { key: string; value: string; updated_at: string };

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'The request could not be completed.'); }
  return response.json() as Promise<T>;
}

function formatDate(value: string) { return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
function ErrorState({ error }: { error: string }) { return error ? <p className="form-error" role="alert">{error}</p> : null; }

function ExplanationWorkspace({ token }: { token: string }) {
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [error, setError] = useState('');
  const load = async () => { try { setExplanation(await request<Explanation>('/api/v1/explanations/forecast', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model_name: 'weighted_ensemble', horizon: 1 }) })); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load explanation.'); } };
  useEffect(() => { void load(); }, [token]);
  return <><div className="workspace-toolbar"><button className="primary-button" type="button" onClick={() => void load()}>Explain latest forecast</button></div><ErrorState error={error} />{explanation && <><div className="explanation-summary"><p className="eyebrow">Natural-language explanation</p><p>{explanation.explanation}</p><span>{explanation.model_name.replace('_', ' ')} · {formatDate(explanation.forecast_for)}</span></div><div className="contribution-grid">{Object.entries(explanation.feature_contributions).map(([feature, value]) => <article className="contribution-card" key={feature}><span>{feature.replaceAll('_', ' ')}</span><strong>{value > 0 ? '+' : ''}{value.toFixed(2)}</strong><small>feature contribution</small></article>)}</div></>}</>;
}

function RecommendationsWorkspace({ token }: { token: string }) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [error, setError] = useState('');
  const load = async () => { try { setItems(await request<Recommendation[]>('/api/v1/recommendations', token)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load recommendations.'); } };
  useEffect(() => { void load(); }, [token]);
  const updateStatus = async (id: number, status: string) => { try { await request(`/api/v1/recommendations/${id}/status`, token, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update recommendation.'); } };
  const createDefault = async () => { try { await request('/api/v1/recommendations', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: 'peak_management', priority: 'high', action: 'Review controllable commercial load during the next forecast peak window.', expected_reduction_mw: 50, expected_savings: 12000, time_window: 'Next forecast peak', confidence: 0.78, reason: 'Generated from the current peak-risk workflow.' }) }); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create recommendation.'); } };
  return <><div className="workspace-toolbar"><button className="primary-button" type="button" onClick={() => void createDefault()}>Create peak action</button><button className="secondary-button" type="button" onClick={() => void load()}>Refresh actions</button></div><ErrorState error={error} />{items.length === 0 ? <div className="workspace-state">No recommendations yet. Generate a peak action to start the queue.</div> : <div className="recommendation-list">{items.map((item) => <article className="recommendation-card" key={item.id}><div className="recommendation-heading"><span className={`recommendation-priority priority-${item.priority}`}>{item.priority}</span><span className="recommendation-status">{item.status}</span></div><h3>{item.category.replaceAll('_', ' ')}</h3><p>{item.action}</p><small>{item.time_window} · {Math.round(item.confidence * 100)}% confidence · {item.expected_reduction_mw ?? 0} MW expected reduction</small><select value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value)}><option value="open">Open</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="completed">Completed</option></select></article>)}</div>}</>;
}

function ReportsWorkspace({ token }: { token: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [type, setType] = useState('forecast');
  const [format, setFormat] = useState('json');
  const [error, setError] = useState('');
  const load = async () => { try { setReports(await request<Report[]>('/api/v1/reports', token)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load reports.'); } };
  useEffect(() => { void load(); }, [token]);
  const generate = async () => { try { await request('/api/v1/reports/generate', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, format, horizon: 24, model_name: 'weighted_ensemble' }) }); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to generate report.'); } };
  const exportReport = async (report: Report) => { try { const response = await fetch(`/api/v1/reports/${report.id}/export`, { headers: { Authorization: `Bearer ${token}` } }); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `gridsense-report-${report.id}.${report.format}`; link.click(); URL.revokeObjectURL(url); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to export report.'); } };
  return <><div className="workspace-toolbar"><label>Report type<select value={type} onChange={(event) => setType(event.target.value)}><option value="forecast">Forecast</option><option value="recommendations">Recommendations</option><option value="model_comparison">Model comparison</option><option value="audit">Audit</option></select></label><label>Format<select value={format} onChange={(event) => setFormat(event.target.value)}><option value="json">JSON</option><option value="csv">CSV</option></select></label><button className="primary-button" type="button" onClick={() => void generate()}>Generate report</button></div><ErrorState error={error} /><div className="report-list">{reports.map((report) => <article className="report-row" key={report.id}><div><strong>{report.type.replaceAll('_', ' ')}</strong><span>{formatDate(report.created_at)} · {report.format.toUpperCase()} · {report.status}</span></div><button className="secondary-button" type="button" onClick={() => void exportReport(report)}>Export</button></article>)}</div></>;
}

function ResearchWorkspace({ token }: { token: string }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [name, setName] = useState('Baseline model comparison');
  const [error, setError] = useState('');
  const load = async () => { try { setExperiments(await request<Experiment[]>('/api/v1/research/experiments', token)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load experiments.'); } };
  useEffect(() => { void load(); }, [token]);
  const create = async (event: FormEvent) => { event.preventDefault(); try { await request('/api/v1/research/experiments', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parameters: { evaluation: 'baseline_comparison' } }) }); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create experiment.'); } };
  const run = async (id: number) => { try { await request(`/api/v1/research/experiments/${id}/run`, token, { method: 'POST' }); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to run experiment.'); } };
  return <><form className="workspace-toolbar" onSubmit={create}><label>Experiment name<input value={name} onChange={(event) => setName(event.target.value)} /></label><button className="primary-button" type="submit">Create experiment</button></form><ErrorState error={error} /><div className="experiment-list">{experiments.map((experiment) => <article className="experiment-card" key={experiment.id}><div className="recommendation-heading"><div><h3>{experiment.name}</h3><span>{experiment.status} · {formatDate(experiment.created_at)}</span></div><button className="secondary-button" type="button" onClick={() => void run(experiment.id)}>Run comparison</button></div>{experiment.results.length > 0 && <div className="experiment-results">{experiment.results.map((result) => <span key={result.model_name}><strong>{result.model_name.replace('_', ' ')}</strong><small>MAPE {result.metrics.mape?.toFixed(2)}%</small></span>)}</div>}</article>)}</div></>;
}

function AdminWorkspace({ token, settingsOnly }: { token: string; settingsOnly?: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [error, setError] = useState('');
  const load = async () => { try { if (!settingsOnly) { setUsers(await request<AdminUser[]>('/api/v1/admin/users', token)); setLogs(await request<AuditLog[]>('/api/v1/admin/audit-logs', token)); } setSettings(await request<Setting[]>('/api/v1/admin/settings', token)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to load administration data.'); } };
  useEffect(() => { void load(); }, [token, settingsOnly]);
  const toggle = async (user: AdminUser) => { try { await request(`/api/v1/admin/users/${user.id}/active?active=${!user.is_active}`, token, { method: 'PATCH' }); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update user.'); } };
  const updateSetting = async (setting: Setting, value: string) => { try { await request(`/api/v1/admin/settings/${encodeURIComponent(setting.key)}`, token, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) }); await load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update setting.'); } };
  return <><ErrorState error={error} />{!settingsOnly && <><div className="admin-section"><div className="panel-heading"><div><h2>User access</h2><p>Active state is enforced by backend authentication.</p></div></div><div className="admin-user-list">{users.map((user) => <div className="admin-user-row" key={user.id}><div><strong>{user.display_name}</strong><span>{user.email} · {user.role}</span></div><button className="secondary-button" type="button" onClick={() => void toggle(user)}>{user.is_active ? 'Deactivate' : 'Activate'}</button></div>)}</div></div><div className="admin-section"><div className="panel-heading"><div><h2>Audit activity</h2><p>Recent security and operational changes.</p></div></div><div className="audit-list">{logs.slice(0, 8).map((log) => <div className="audit-row" key={log.id}><strong>{log.action.replaceAll('_', ' ')}</strong><span>{log.resource_type} · {formatDate(log.created_at)}</span></div>)}</div></div></>}{<div className="admin-section"><div className="panel-heading"><div><h2>System settings</h2><p>Only Super Admins can change these values.</p></div></div><div className="settings-list">{settings.length === 0 && <p className="workspace-muted">No settings have been persisted yet.</p>}{settings.map((setting) => <div className="setting-row" key={setting.key}><label>{setting.key}<input defaultValue={setting.value} onBlur={(event) => void updateSetting(setting, event.target.value)} /></label></div>)}</div></div>}</>;
}

export function AdvancedWorkspace({ kind }: { kind: AdvancedKind }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <div className="workspace-state">Waiting for an authenticated session...</div>;
  if (kind === 'explanation') return <ExplanationWorkspace token={accessToken} />;
  if (kind === 'recommendations') return <RecommendationsWorkspace token={accessToken} />;
  if (kind === 'reports') return <ReportsWorkspace token={accessToken} />;
  if (kind === 'research') return <ResearchWorkspace token={accessToken} />;
  return <AdminWorkspace token={accessToken} settingsOnly={kind === 'settings'} />;
}
