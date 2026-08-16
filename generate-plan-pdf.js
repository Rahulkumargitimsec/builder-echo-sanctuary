const fs = require('fs');

const output = 'gridsense-ai-development-plan.pdf';
const pageWidth = 595;
const pageHeight = 842;
const margin = 50;
const bodySize = 10;
const bodyLeading = 14;
const blue = [0.10, 0.30, 0.75];
const navy = [0.06, 0.16, 0.26];
const muted = [0.35, 0.45, 0.55];

const sections = [
  {
    title: 'Phase 0: Project Recovery and Workspace Setup',
    intro: 'Restore or create the application foundation and make the development environment runnable.',
    bullets: [
      'Add package.json and pnpm workspace configuration.',
      'Set up Next.js, TypeScript, Tailwind CSS, and reusable UI foundations.',
      'Set up the FastAPI backend and PostgreSQL configuration.',
      'Add an environment variable template and Docker Compose setup.',
      'Configure Builder setup command: pnpm install.',
      'Configure Builder dev command: pnpm dev.',
      'Recommended structure: frontend, backend, ai, database, docker, tests, docker-compose.yml, README.md.'
    ]
  },
  {
    title: 'Phase 1: Product Architecture and UX Design',
    intro: 'Define the page map, user journeys, permissions, responsive layout, and visual system.',
    bullets: [
      'Pages: Landing, Login, Dashboard, Forecast, Peak Prediction, AI Explanation, Recommendations, Alerts, Analytics, Datasets, Model Training, Model Comparison, Research, Reports, Profile, Settings, and Admin Panel.',
      'Create a page and routing map and a role-permission matrix.',
      'Build the responsive application shell and sidebar.',
      'Create design tokens and reusable cards, tables, charts, forms, modals, and alerts.',
      'Define loading, empty, and error states.'
    ]
  },
  {
    title: 'Phase 2: Landing Website and Authentication',
    intro: 'Build the public landing experience and secure user access.',
    bullets: [
      'Landing sections: Hero, Features, AI Engine, Technology, Architecture, Research, Contact, and Request Demo.',
      'Implement login, logout, password hashing, JWT access tokens, and refresh-token handling.',
      'Protect frontend routes and enforce authorization in the backend.',
      'Support Super Admin, Grid Operator, and Research Analyst roles.',
      'Acceptance: users authenticate safely, protected pages reject unauthenticated access, and each role sees only permitted modules.'
    ]
  },
  {
    title: 'Phase 3: Database and Backend Foundation',
    intro: 'Create the FastAPI service, PostgreSQL schema, migrations, and API contracts.',
    bullets: [
      'Core tables: Users, Roles, HistoricalLoad, Weather, Calendar, Predictions, Recommendations, Reports, Alerts, ResearchResults, and TrainingLogs.',
      'Use SQLAlchemy models, Pydantic schemas, service and repository layers, versioned APIs, structured errors, and audit logging.',
      'API groups: auth, users, dashboard, forecast, peaks, explanations, recommendations, datasets, models, reports, research, and alerts.'
    ]
  },
  {
    title: 'Phase 4: Dataset Management',
    intro: 'Build reliable ingestion for historical load, weather, calendar, holidays, festivals, and related predictors.',
    bullets: [
      'Support CSV upload, preview, column mapping, and dataset versioning.',
      'Validate date and time, missing values, duplicates, units, and schema.',
      'Generate a data-quality report and preserve import history.',
      'Store historical load, temperature, rainfall, weekend, holiday, festival, previous-day, and previous-week features.',
      'Acceptance: invalid datasets are rejected with clear messages; valid datasets can be stored, queried, and reviewed before training.'
    ]
  },
  {
    title: 'Phase 5: Baseline Forecasting Pipeline',
    intro: 'Deliver a dependable forecasting product before adding complex deep-learning models.',
    bullets: [
      'Pipeline: historical data -> cleaning -> feature engineering -> train/test split -> baseline model -> forecast -> evaluation.',
      'Initial models: persistence, moving average, linear regression, Random Forest, and XGBoost.',
      'Outputs: hourly demand, peak demand, peak timing, confidence score, forecast horizon, and selected model.',
      'Metrics: MAE, RMSE, MAPE, R2, peak timing error, and peak magnitude error.'
    ]
  },
  {
    title: 'Phase 6: Advanced AI Models',
    intro: 'Implement the hybrid architecture incrementally and keep each training run reproducible.',
    bullets: [
      'Target pipeline: historical load -> feature engineering -> Transformer -> LSTM -> XGBoost -> forecast ensemble -> SHAP -> recommendation engine.',
      'Use Transformer models for temporal patterns, LSTM for sequential dependencies, and XGBoost for feature-based correction.',
      'Add an ensemble or stacking layer, model versioning, and artifact storage.',
      'Support training date range, horizon, feature, and hyperparameter controls.',
      'Store training progress, validation metrics, and deployment status.'
    ]
  },
  {
    title: 'Phase 7: Dashboard and Forecast Experience',
    intro: 'Connect operational screens to backend APIs.',
    bullets: [
      'Dashboard cards: Current Load, Today\'s Peak, Tomorrow\'s Peak, Temperature, Rainfall, Prediction Accuracy, Confidence, Commercial Load, Active Alerts, and Recommendations.',
      'Charts: hourly, weekly, monthly, and yearly demand; peak history; actual versus predicted load; confidence intervals.',
      'Forecast workflow: date, range, and model filters; hourly forecast table; peak details; and export action.',
      'Acceptance: charts use API data, filters update results, and empty or failed responses are visible and understandable.'
    ]
  },
  {
    title: 'Phase 8: Peak Prediction and Alerts',
    intro: 'Monitor peak-load risk and notify operators before critical periods.',
    bullets: [
      'Show today\'s and tomorrow\'s peak, peak duration, timing, probability, and severity.',
      'Create high-demand, low-confidence, forecast-deviation, data-quality, and model-performance alerts.',
      'Support severity, acknowledgement, filtering, history, and role-based visibility.'
    ]
  },
  {
    title: 'Phase 9: Explainable AI',
    intro: 'Make each prediction understandable to grid operators and researchers.',
    bullets: [
      'Provide global and per-prediction SHAP feature importance.',
      'Show positive and negative feature effects.',
      'Generate a natural-language explanation.',
      'Support model explanation comparison.',
      'Explain the impact of temperature, previous load, calendar, rainfall, festivals, and hour of day.',
      'Acceptance: every forecast links to an explanation generated from the selected model and prediction.'
    ]
  },
  {
    title: 'Phase 10: Recommendation Engine',
    intro: 'Convert forecasts into operational actions.',
    bullets: [
      'Recommendation categories: commercial load reduction, power purchase planning, demand response, and peak management.',
      'Recommendation fields: priority, action, expected load reduction, expected savings, time window, confidence, reason, and status.',
      'Identify high-demand windows, estimate controllable commercial load, recommend reduction periods, estimate savings, recommend additional power purchase, and track completion.'
    ]
  },
  {
    title: 'Phase 11: Reports, Analytics, and Research',
    intro: 'Add reporting, exports, analytics, and model-analysis capabilities.',
    bullets: [
      'Reports: daily demand, weekly forecast, monthly peak, model performance, savings, and data quality.',
      'Exports: PDF, CSV, Excel-compatible data, and JSON.',
      'Research dashboard: dataset versions, experiment history, model comparison, metrics, visualizations, reproducibility metadata, and research-result exports.',
      'Compare accuracy, training duration, inference time, peak accuracy, confidence, and SHAP results.'
    ]
  },
  {
    title: 'Phase 12: Administration, Security, and Auditing',
    intro: 'Complete enterprise administration and security controls.',
    bullets: [
      'Provide user management, role assignment, account activation, and deactivation.',
      'Control dataset permissions, model deployment, and system settings.',
      'Store audit logs, training logs, and API activity logs.',
      'Use JWT expiration, backend authorization, input and upload validation, rate limiting, restricted CORS, secure secrets, safe logging, backups, and recovery.'
    ]
  },
  {
    title: 'Phase 13: Testing and Quality Assurance',
    intro: 'Implement testing throughout the project rather than waiting until the end.',
    bullets: [
      'Frontend: components, validation, route protection, charts, and role navigation.',
      'Backend: authentication, RBAC, APIs, repositories, dataset validation, forecasting, and recommendations.',
      'AI: feature engineering, leakage prevention, output shapes, metrics, reproducibility, and SHAP.',
      'Integration: login to dashboard, upload to forecast, training to comparison, forecast to recommendation, and report generation.'
    ]
  },
  {
    title: 'Phase 14: Deployment and Operations',
    intro: 'Prepare production deployment using containers and operational safeguards.',
    bullets: [
      'Create frontend and backend Dockerfiles.',
      'Configure PostgreSQL, NGINX reverse proxy, and production environment settings.',
      'Add health checks, migrations, logging, monitoring, backups, and recovery.',
      'Automate the delivery sequence: build -> run tests -> build Docker images -> apply migrations -> deploy backend -> deploy frontend -> run health checks.'
    ]
  }
];

function ascii(value) {
  return value.replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-').replace(/→/g, '->').replace(/²/g, '2').replace(/[^\x00-\x7F]/g, '');
}
function escapePdf(value) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function wrap(text, maxChars) {
  const words = ascii(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

const pages = [];
function addPage(lines) { pages.push(lines); }
addPage([
  { text: 'GridSense AI', size: 28, color: navy, gap: 5 },
  { text: 'Intelligent Electricity Demand & Peak Load Forecasting System', size: 15, color: blue, gap: 3 },
  { text: 'for Delhi Power Grid', size: 15, color: blue, gap: 18 },
  { text: 'Enterprise Product Development Roadmap', size: 11, color: muted, gap: 24 },
  { text: 'Phased implementation plan for hourly demand forecasting, peak prediction, explainable AI, load reduction, power purchase planning, reporting, model comparison, and research.', size: 11, color: navy, gap: 12 },
  { text: 'Current prerequisite: the repository is empty and pnpm install fails because no package.json exists. Restore the intended repository contents or create the initial scaffold before feature development.', size: 10, color: muted, gap: 0 }
]);

let pageLines = [];
function ensurePage() {
  if (pageLines.length) { addPage(pageLines); pageLines = []; }
}
function addWrapped(text, options = {}) {
  const lines = wrap(text, options.maxChars || 88);
  for (const line of lines) pageLines.push({ text: line, size: options.size || bodySize, color: options.color || navy, bullet: options.bullet || false, gap: options.gap ?? 2 });
}
function addSection(section) {
  if (pageLines.length) ensurePage();
  pageLines.push({ text: section.title, size: 17, color: navy, heading: true, gap: 9 });
  addWrapped(section.intro, { size: 10.5, color: navy, maxChars: 82, gap: 8 });
  for (const bullet of section.bullets) addWrapped(bullet, { bullet: true, maxChars: 82, gap: 4 });
}
for (const section of sections) addSection(section);
ensurePage();

const overview = [
  { text: 'Roadmap at a Glance', size: 19, color: navy, heading: true, gap: 9 },
  { text: '0  Project recovery - runnable frontend and backend workspace', size: 10, color: navy, gap: 3 },
  { text: '1  Architecture and UX - approved routes, roles, and design system', size: 10, color: navy, gap: 3 },
  { text: '2  Authentication - secure login and role-based access', size: 10, color: navy, gap: 3 },
  { text: '3  Backend and database - versioned API and PostgreSQL foundation', size: 10, color: navy, gap: 3 },
  { text: '4  Dataset management - validated, versioned load and weather data', size: 10, color: navy, gap: 3 },
  { text: '5  Baseline forecasting - first reliable hourly forecast product', size: 10, color: navy, gap: 3 },
  { text: '6  Advanced AI models - Transformer, LSTM, and XGBoost ensemble', size: 10, color: navy, gap: 3 },
  { text: '7  Dashboard and forecast UX - operational monitoring and forecast workflows', size: 10, color: navy, gap: 3 },
  { text: '8  Peak prediction and alerts - peak-risk monitoring and notifications', size: 10, color: navy, gap: 3 },
  { text: '9  Explainable AI - SHAP-based feature and prediction explanations', size: 10, color: navy, gap: 3 },
  { text: '10 Recommendation engine - commercial load and power purchase actions', size: 10, color: navy, gap: 3 },
  { text: '11 Reports and research - exports, analytics, and experiment comparison', size: 10, color: navy, gap: 3 },
  { text: '12 Administration and security - enterprise controls and auditing', size: 10, color: navy, gap: 3 },
  { text: '13 Testing - automated confidence across the system', size: 10, color: navy, gap: 3 },
  { text: '14 Deployment - production-ready containers and operations', size: 10, color: navy, gap: 3 }
];
pages.splice(1, 0, overview);

const mvp = [
  { text: 'Recommended MVP Sequence', size: 19, color: navy, heading: true, gap: 9 },
  { text: '1. Project setup', size: 11, color: navy, gap: 4 },
  { text: '2. Authentication and RBAC', size: 11, color: navy, gap: 4 },
  { text: '3. Database foundation', size: 11, color: navy, gap: 4 },
  { text: '4. Dataset upload', size: 11, color: navy, gap: 4 },
  { text: '5. Baseline forecasting', size: 11, color: navy, gap: 4 },
  { text: '6. Dashboard', size: 11, color: navy, gap: 4 },
  { text: '7. Peak prediction', size: 11, color: navy, gap: 4 },
  { text: '8. Basic recommendations', size: 11, color: navy, gap: 4 },
  { text: '9. Reports', size: 11, color: navy, gap: 4 },
  { text: '10. Testing and deployment', size: 11, color: navy, gap: 20 },
  { text: 'After the MVP is stable, add the Transformer, LSTM, hybrid ensemble, SHAP explanations, advanced research tools, and automated power-purchase optimization.', size: 11, color: navy, gap: 0 }
];
pages.push(mvp);

function pageContent(lines) {
  let y = pageHeight - margin;
  const commands = ['q'];
  for (const item of lines) {
    const size = item.size || bodySize;
    const leading = size >= 16 ? size + 8 : bodyLeading;
    y -= item.heading ? 4 : 0;
    if (y < margin + leading) break;
    const color = item.color || navy;
    commands.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    const prefix = item.bullet ? '- ' : '';
    commands.push(`BT /F1 ${size} Tf ${margin} ${y} Td (${escapePdf(prefix + item.text)}) Tj ET`);
    y -= leading + (item.gap || 0);
  }
  commands.push('Q');
  return commands.join('\n');
}

const objects = [];
objects.push('<< /Type /Catalog /Pages 2 0 R >>');
const pageObjectIds = [];
const fontId = 3;
let nextId = 4;
for (const lines of pages) {
  const content = pageContent(lines);
  const contentId = nextId++;
  const pageId = nextId++;
  objects[contentId - 1] = `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`;
  objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  pageObjectIds.push(pageId);
}
objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

let pdf = '%PDF-1.4\n';
const offsets = [0];
for (let i = 0; i < objects.length; i++) {
  if (!objects[i]) objects[i] = '<< >>';
  offsets.push(Buffer.byteLength(pdf, 'ascii'));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefOffset = Buffer.byteLength(pdf, 'ascii');
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
fs.writeFileSync(output, pdf, 'ascii');
console.log(`Wrote ${output} (${pages.length} pages)`);
