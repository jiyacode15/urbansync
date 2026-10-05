document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
    return;
  }

  const page = document.querySelector('[data-admin-page]')?.dataset.adminPage;
  const loaders = {
    dashboard: loadAdminDashboard,
    issues: loadIssueManagement,
    map: loadAdminMap,
    departments: loadDepartments,
    analytics: loadAnalytics,
    feedback: loadFeedback,
    performance: loadPerformance,
  };
  if (loaders[page]) {
    loaders[page]().catch((error) => {
      console.error(`Unable to load admin ${page}:`, error);
      showAdminLoadError();
    });
  }
});

async function apiGet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

async function apiPatch(url, payload) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || 'Update failed.');
  return result;
}

async function handleAdminLogin(event) {
  event.preventDefault();
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.detail || 'Login failed.');
      return;
    }
    window.location.href = '/admin/dashboard';
  } catch (error) {
    console.error('Admin login failed:', error);
    showToast('Unable to contact the UrbanSync service.');
  }
}

async function loadAdminDashboard() {
  const [stats, issues, analytics, activity] = await Promise.all([
    apiGet('/api/dashboard/stats'),
    apiGet('/api/admin/issues'),
    apiGet('/api/analytics'),
    apiGet('/api/activity'),
  ]);

  const cards = [
    ['Total Reports', stats.total_reports],
    ['Open Issues', stats.open_issues],
    ['Critical Issues', stats.critical_issues],
    ['Resolved Today', stats.resolved_today],
    ['Citizen Satisfaction', `${stats.citizen_satisfaction}%`],
  ];
  document.getElementById('admin-kpis').innerHTML = cards.map(([label, value]) => `
    <div class="kpi-card glass"><span>${escapeHTML(valueLabel(label))}</span><strong>${escapeHTML(value)}</strong></div>
  `).join('');

  document.getElementById('admin-activity').innerHTML = activity.length
    ? activity.slice(0, 8).map((item) => `
      <div class="activity-item"><span class="activity-dot"></span><div><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.time)} • ${escapeHTML(item.status)}</small></div></div>
    `).join('')
    : emptyState('No city activity has been recorded yet.');

  document.getElementById('admin-insights').innerHTML = (analytics.intelligence || []).map((insight) => `
    <div class="insight-item"><p>${escapeHTML(insight)}</p></div>
  `).join('') || emptyState('No intelligence insights are available yet.');

  document.getElementById('admin-issue-table').innerHTML = issues.slice(0, 8).map((issue) => `
    <tr>
      <td>${escapeHTML(issue.ticket_id)}</td>
      <td><a class="table-link" href="/issue/${Number(issue.id)}">${escapeHTML(issue.title)}</a></td>
      <td>${escapeHTML(issue.area)}</td>
      <td><span class="status-pill">${escapeHTML(issue.status)}</span></td>
      <td>${escapeHTML(issue.priority)}</td>
      <td>${escapeHTML(issue.department || 'Unassigned')}</td>
      <td>${formatDate(issue.created_at)}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">No reports available.</td></tr>';

  renderDashboardCharts(issues, analytics);
}

function renderDashboardCharts(issues, analytics) {
  if (typeof Chart === 'undefined') return;
  const byStatus = new Map((analytics.status_counts || []).map((item) => [item.label, item.value]));
  createChart('categoryChart', 'bar', analytics.category_counts || [], 'Issues by Category');
  createChart('resolutionChart', 'line', [
    { label: 'Reports', value: analytics.total_reports || 0 },
    { label: 'Resolved', value: analytics.resolved_reports || 0 },
  ], 'Reports vs Resolutions');
  createChart('departmentChart', 'doughnut', analytics.department_performance.map((item) => ({
    label: item.name,
    value: item.total,
  })), 'Reports by Department');
  createChart('satisfactionChart', 'radar', analytics.department_performance.map((item) => ({
    label: item.name,
    value: item.rating * 20,
  })), 'Department Citizen Rating');
  createChart('priorityChart', 'polarArea', analytics.priority_counts || [], 'Issue Priority Distribution');
  createChart('statusChart', 'doughnut', [...byStatus].map(([label, value]) => ({ label, value })), 'Issue Status Overview');
}

async function loadIssueManagement() {
  const [issues, departments] = await Promise.all([
    apiGet('/api/admin/issues'),
    apiGet('/api/admin/departments'),
  ]);
  const filters = {
    search: document.getElementById('admin-search'),
    category: document.getElementById('filter-category'),
    status: document.getElementById('filter-status'),
    priority: document.getElementById('filter-priority'),
    area: document.getElementById('filter-area'),
  };
  populateFilter(filters.category, issues.map((item) => item.category), 'All categories');
  populateFilter(filters.status, issues.map((item) => item.status), 'All statuses');
  populateFilter(filters.priority, issues.map((item) => item.priority), 'All priorities');
  populateFilter(filters.area, issues.map((item) => item.area), 'All areas');

  const table = document.getElementById('admin-issue-table');
  const render = () => {
    const search = filters.search.value.trim().toLowerCase();
    const visible = issues.filter((issue) => {
      const text = `${issue.ticket_id} ${issue.title} ${issue.area} ${issue.category} ${issue.department || ''}`.toLowerCase();
      return (!search || text.includes(search))
        && (!filters.category.value || issue.category === filters.category.value)
        && (!filters.status.value || issue.status === filters.status.value)
        && (!filters.priority.value || issue.priority === filters.priority.value)
        && (!filters.area.value || issue.area === filters.area.value);
    });
    table.innerHTML = visible.map((issue) => `
      <tr data-issue-row="${Number(issue.id)}">
        <td>${escapeHTML(issue.ticket_id)}</td>
        <td><a class="table-link" href="/issue/${Number(issue.id)}">${escapeHTML(issue.title)}</a></td>
        <td>${escapeHTML(issue.category)}</td>
        <td>${escapeHTML(issue.area)}</td>
        <td><select class="issue-edit" data-field="priority" data-id="${Number(issue.id)}" data-previous-value="${escapeHTML(issue.priority)}" aria-label="Priority for ${escapeHTML(issue.ticket_id)}">
          ${selectOptions(['Low', 'Medium', 'High', 'Critical'], issue.priority)}
        </select></td>
        <td><select class="issue-edit department-select" data-field="department_id" data-id="${Number(issue.id)}" data-previous-value="${Number(issue.department_id || 0)}" aria-label="Department for ${escapeHTML(issue.ticket_id)}">
          ${departments.map((department) => `<option value="${Number(department.id)}" ${department.name === issue.department ? 'selected' : ''}>${escapeHTML(department.name)}</option>`).join('')}
        </select></td>
        <td><select class="issue-edit" data-field="status" data-id="${Number(issue.id)}" data-previous-value="${escapeHTML(issue.status)}" aria-label="Status for ${escapeHTML(issue.ticket_id)}">
          ${selectOptions(['Reported', 'Verified', 'Assigned', 'In Progress', 'Resolved'], issue.status)}
        </select></td>
        <td>${formatDate(issue.created_at)}</td>
      </tr>
    `).join('') || '<tr><td colspan="8">No reports match these filters.</td></tr>';
  };

  Object.values(filters).forEach((control) => {
    control.addEventListener(control === filters.search ? 'input' : 'change', render);
  });
  table.addEventListener('change', async (event) => {
    const control = event.target.closest('.issue-edit');
    if (!control) return;
    const field = control.dataset.field;
    const value = field === 'department_id' ? Number(control.value) : control.value;
    try {
      await apiPatch(`/api/admin/issues/${Number(control.dataset.id)}`, { [field]: value });
      control.dataset.previousValue = control.value;
      showToast('Issue updated and saved.');
    } catch (error) {
      console.error('Issue update failed:', error);
      showToast(error.message);
      if (control.dataset.previousValue) control.value = control.dataset.previousValue;
    }
    control.dataset.previousValue = control.value;
  });
  render();
}

async function loadAdminMap() {
  if (typeof L === 'undefined') throw new Error('Leaflet did not load.');
  const issues = await apiGet('/api/map/issues');
  const map = L.map('admin-city-map').setView([19.27, 72.85], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const colors = { Low: '#34d399', Medium: '#fbbf24', High: '#fb7185', Critical: '#ef4444' };
  const markers = [];
  issues.forEach((issue) => {
    if (issue.latitude == null || issue.longitude == null) return;
    const marker = L.circleMarker([issue.latitude, issue.longitude], {
      radius: 9,
      color: colors[issue.priority] || '#5ee7ff',
      fillColor: colors[issue.priority] || '#5ee7ff',
      fillOpacity: 0.9,
      weight: 2,
    });
    marker.bindPopup(`
      <strong>${escapeHTML(issue.title)}</strong><br>
      Ticket: ${escapeHTML(issue.ticket_id)}<br>
      Category: ${escapeHTML(issue.category)}<br>
      Priority: ${escapeHTML(issue.priority)}<br>
      Status: ${escapeHTML(issue.status)}<br>
      <a href="/issue/${Number(issue.id)}">View issue →</a>
    `).addTo(map);
    markers.push(marker);
  });
  if (markers.length) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.15));
  }
  document.getElementById('map-issue-list').innerHTML = issues.length
    ? issues.map((issue) => `<a class="map-issue-link" href="/issue/${Number(issue.id)}"><strong>${escapeHTML(issue.ticket_id)}</strong><span>${escapeHTML(issue.title)} • ${escapeHTML(issue.area)} • ${escapeHTML(issue.status)}</span></a>`).join('')
    : emptyState('No mapped reports yet.');
  window.setTimeout(() => map.invalidateSize(), 150);
}

async function loadDepartments() {
  const [departments, performance] = await Promise.all([
    apiGet('/api/departments'),
    apiGet('/api/admin/performance'),
  ]);
  const performanceById = new Map(performance.map((item) => [item.id, item]));
  document.getElementById('department-grid').innerHTML = departments.map((department) => {
    const metrics = performanceById.get(department.id) || {};
    return `
      <article class="department-card glass">
        <span class="section-tag">${escapeHTML(department.code || 'CITY')}</span>
        <h3>${escapeHTML(department.name)}</h3>
        <p>${escapeHTML(department.description || 'Urban service department')}</p>
        <div class="department-metrics">
          <div><span>Assigned issues</span><strong>${department.total_reports}</strong></div>
          <div><span>Open</span><strong>${department.open_reports}</strong></div>
          <div><span>Resolved</span><strong>${department.resolved_reports}</strong></div>
          <div><span>Avg resolution</span><strong>${metrics.average_resolution_hours == null ? '—' : `${metrics.average_resolution_hours}h`}</strong></div>
          <div><span>Citizen rating</span><strong>${metrics.citizen_rating ? `${metrics.citizen_rating}/5` : '—'}</strong></div>
        </div>
      </article>
    `;
  }).join('') || emptyState('No departments are registered.');
}

async function loadAnalytics() {
  const [analytics, stats] = await Promise.all([
    apiGet('/api/analytics'),
    apiGet('/api/dashboard/stats'),
  ]);
  createChart('categoryChart', 'bar', analytics.category_counts, 'Reports');
  createChart('areaChart', 'bar', analytics.area_counts, 'Reports');
  createChart('resolutionChart', 'bar', [
    { label: 'Reported', value: analytics.total_reports },
    { label: 'Resolved', value: analytics.resolved_reports },
    { label: 'Open', value: stats.open_issues },
  ], 'Issue count');
  createChart('priorityChart', 'doughnut', analytics.priority_counts, 'Reports');
  createChart('monthlyChart', 'line', [
    { label: 'Reports', values: analytics.monthly_trend.map((item) => item.reports) },
    { label: 'Resolutions', values: analytics.monthly_trend.map((item) => item.resolutions) },
  ], 'Monthly activity', analytics.monthly_trend.map((item) => item.month));
  document.getElementById('resolution-rate').textContent = `${analytics.resolution_rate}%`;
}

async function loadFeedback() {
  const feedback = await apiGet('/api/admin/feedback');
  const stars = feedback.rating_distribution;
  document.getElementById('feedback-summary').innerHTML = `
    <div class="kpi-card glass"><span>Average Citizen Rating</span><strong>${feedback.average_rating}/5</strong></div>
    <div class="kpi-card glass"><span>Total Feedback</span><strong>${feedback.total_feedback}</strong></div>
    <div class="kpi-card glass"><span>5-star ratings</span><strong>${stars['5'].percentage}%</strong></div>
    <div class="kpi-card glass"><span>4-star ratings</span><strong>${stars['4'].percentage}%</strong></div>
    <div class="kpi-card glass"><span>3-star ratings</span><strong>${stars['3'].percentage}%</strong></div>
    <div class="kpi-card glass"><span>2 / 1-star ratings</span><strong>${stars['2'].percentage}% / ${stars['1'].percentage}%</strong></div>
  `;
  document.getElementById('rating-distribution').innerHTML = [5, 4, 3, 2, 1].map((rating) => `
    <div class="rating-row"><strong>${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</strong><div class="performance-track"><span style="width:${stars[String(rating)].percentage}%"></span></div><span>${stars[String(rating)].percentage}%</span></div>
  `).join('');
  document.getElementById('feedback-list').innerHTML = feedback.recent_feedback.map((item) => `
    <article class="feedback-card">
      <div class="feedback-card-heading"><strong>${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</strong><span>${formatDate(item.created_at)}</span></div>
      <p>“${escapeHTML(item.comments)}”</p>
      <small>${escapeHTML(item.ticket_id)} • ${escapeHTML(item.issue_title)} • ${escapeHTML(item.department)}</small>
    </article>
  `).join('') || emptyState('No citizen feedback has been submitted yet.');
}

async function loadPerformance() {
  const departments = await apiGet('/api/admin/performance');
  document.getElementById('performance-grid').innerHTML = departments.map((item) => `
    <article class="performance-card glass">
      <div class="performance-heading"><div><span class="section-tag">DEPARTMENT</span><h3>${escapeHTML(item.name)}</h3></div><strong class="performance-score">${item.performance_score}%</strong></div>
      <div class="performance-track"><span style="width:${item.performance_score}%"></span></div>
      <div class="department-metrics">
        <div><span>Open issues</span><strong>${item.open_issues}</strong></div>
        <div><span>Resolved</span><strong>${item.resolved_issues}</strong></div>
        <div><span>Avg response</span><strong>${item.average_response_hours}h</strong></div>
        <div><span>Avg resolution</span><strong>${item.average_resolution_hours == null ? '—' : `${item.average_resolution_hours}h`}</strong></div>
        <div><span>Citizen rating</span><strong>${item.citizen_rating ? `${item.citizen_rating}/5` : '—'}</strong></div>
      </div>
    </article>
  `).join('') || emptyState('No department performance data is available.');
}

function createChart(canvasId, type, entries, label, labelsOverride) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  const labels = labelsOverride || entries.map((item) => item.label);
  const isMultiSeries = entries.length && entries[0].values;
  const palette = ['#5ee7ff', '#8b5cf6', '#34d399', '#fbbf24', '#ff5a7a', '#a78bfa', '#60a5fa', '#fb923c'];
  const datasets = isMultiSeries
    ? entries.map((item, index) => ({
      label: item.label,
      data: item.values,
      borderColor: palette[index],
      backgroundColor: `${palette[index]}55`,
      tension: 0.35,
    }))
    : [{
      label,
      data: entries.map((item) => item.value),
      backgroundColor: labels.map((_, index) => `${palette[index % palette.length]}bb`),
      borderColor: labels.map((_, index) => palette[index % palette.length]),
      borderWidth: 1,
    }];
  new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#edf2ff' } } },
      scales: ['bar', 'line'].includes(type) ? {
        x: { ticks: { color: '#93a5c9' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { beginAtZero: true, ticks: { color: '#93a5c9', precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } },
      } : undefined,
    },
  });
}

function populateFilter(select, values, label) {
  const selected = select.value;
  const uniqueValues = [...new Set(values)].sort();
  select.innerHTML = `<option value="">${escapeHTML(label)}</option>${uniqueValues.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('')}`;
  select.value = uniqueValues.includes(selected) ? selected : '';
}

function selectOptions(options, selected) {
  return options.map((value) => `<option value="${escapeHTML(value)}" ${value === selected ? 'selected' : ''}>${escapeHTML(value)}</option>`).join('');
}

function valueLabel(value) {
  return String(value);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHTML(message)}</div>`;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showAdminLoadError() {
  const main = document.querySelector('.admin-main');
  if (!main) return;
  main.querySelector('.admin-load-error')?.remove();
  const error = document.createElement('section');
  error.className = 'admin-load-error';
  error.innerHTML = '<h2>Something went wrong.</h2><p>Unable to load this section. Please try again in a moment.</p><a class="secondary-btn" href="/admin/dashboard">Back to Command Center</a>';
  main.append(error);
}
