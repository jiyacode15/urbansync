document.addEventListener('DOMContentLoaded', async () => {
  const issueId = window.issueId;
  if (issueId) {
    loadIssueDetail(issueId);
  }
  const path = window.location.pathname;
  if (path === '/dashboard') {
    loadCitizenDashboard();
  }
  if (path === '/services') {
    renderServiceHealth();
  }
  if (path === '/community') {
    renderTrendingConcerns();
  }
});

async function loadIssueDetail(issueId) {
  try {
    const issue = await fetch(`/api/issues/${issueId}`).then((res) => res.json());
    document.getElementById('detail-title').textContent = issue.title;
    document.getElementById('detail-ticket').textContent = issue.ticket_id;
    document.getElementById('detail-priority').textContent = issue.priority;
    document.getElementById('detail-status').textContent = issue.status;
    document.getElementById('detail-department').textContent = issue.department || 'Unassigned';
    document.getElementById('detail-location').textContent = `${issue.area}${issue.landmark ? ` • ${issue.landmark}` : ''}`;
    document.getElementById('detail-date').textContent = new Date(issue.created_at).toLocaleDateString();
    document.getElementById('detail-support').textContent = `${issue.support_count} supporters`;
    document.getElementById('detail-description').textContent = issue.description;

    const timeline = document.getElementById('timeline');
    const steps = [
      { label: 'Report Submitted', date: issue.created_at },
      { label: 'Verified', date: issue.updated_at },
      { label: 'Assigned', date: issue.updated_at },
      { label: 'In Progress', date: issue.updated_at },
      { label: 'Resolved', date: issue.resolved_at || null }
    ];
    timeline.innerHTML = steps.map((step, index) => {
      const active = issue.status === step.label || (issue.status === 'Resolved' && step.label === 'Resolved') || (issue.status === 'In Progress' && step.label === 'In Progress');
      const stage = step.date ? new Date(step.date).toLocaleString() : 'Pending';
      return `<div class="timeline-item ${active ? '' : 'inactive'}"><div><strong>${step.label}</strong><small>${stage}</small></div></div>`;
    }).join('');

    document.getElementById('support-btn').addEventListener('click', async () => {
      const result = await fetch(`/api/issues/${issueId}/support`, { method: 'POST' });
      const data = await result.json();
      showToast(data.message || 'Support recorded.');
      document.getElementById('detail-support').textContent = `${data.support_count} supporters`;
    });
  } catch (error) {
    console.error(error);
  }
}

async function loadCitizenDashboard() {
  try {
    const issues = await fetch('/api/issues').then((res) => res.json());
    const metricContainer = document.getElementById('dashboard-metrics');
    metricContainer.innerHTML = `
      <article class="stat-card glass"><i class="fa-solid fa-file-lines"></i><div><span>Reports Submitted</span><strong>${issues.length}</strong><small>Tracked</small></div></article>
      <article class="stat-card glass"><i class="fa-solid fa-check"></i><div><span>Issues Resolved</span><strong>${issues.filter(i => i.status === 'Resolved').length}</strong><small>Complete</small></div></article>
      <article class="stat-card glass"><i class="fa-solid fa-spinner"></i><div><span>Issues In Progress</span><strong>${issues.filter(i => i.status === 'In Progress').length}</strong><small>Active</small></div></article>
      <article class="stat-card glass"><i class="fa-solid fa-people-group"></i><div><span>Community Contributions</span><strong>${issues.reduce((sum, i) => sum + i.support_count, 0)}</strong><small>Supporters</small></div></article>
    `;

    const list = document.getElementById('my-reports-list');
    list.innerHTML = issues.slice(0, 5).map((issue) => `
      <div class="issue-row glass">
        <div><strong>${issue.title}</strong><small>${issue.ticket_id}</small></div>
        <div><small>Area</small><br />${issue.area}</div>
        <div><small>Category</small><br />${issue.category}</div>
        <div><small>Status</small><br /><span class="status-chip">${issue.status}</span></div>
        <div><small>Priority</small><br /><span class="badge">${issue.priority}</span></div>
        <div><small>View</small><br /><a href="/issue/${issue.id}">Open</a></div>
      </div>
    `).join('');
  } catch (error) {
    console.error(error);
  }
}

async function renderServiceHealth() {
  try {
    const serviceHealth = document.getElementById('service-health');
    if (!serviceHealth) return;
    const items = [
      { name: 'Water Supply', value: 94 },
      { name: 'Waste Management', value: 87 },
      { name: 'Road Maintenance', value: 72 },
      { name: 'Street Lighting', value: 91 },
      { name: 'Traffic Management', value: 81 }
    ];
    serviceHealth.innerHTML = items.map((item) => `
      <div class="health-row">
        <strong>${item.name}</strong>
        <div class="progress"><span style="--progress:${item.value}% ; width:${item.value}%"></span></div>
        <span>${item.value}%</span>
      </div>
    `).join('');

    const serviceGrid = document.getElementById('service-grid');
    if (serviceGrid) {
      serviceGrid.innerHTML = [
        ['Water Supply', 'Operational', '12 active reports', '4.2 hrs'],
        ['Waste Management', 'Operational', '18 active reports', '2.8 hrs'],
        ['Road Maintenance', 'Monitoring', '21 active reports', '6.1 hrs'],
        ['Public Transport', 'Stable', '9 active reports', '3.5 hrs'],
        ['Traffic Management', 'Adaptive', '14 active reports', '5.2 hrs'],
        ['Street Lighting', 'Operational', '11 active reports', '3.1 hrs'],
        ['Public Safety', 'Priority', '7 active reports', '2.4 hrs'],
        ['Parks & Recreation', 'Healthy', '6 active reports', '7.8 hrs']
      ].map(([name, status, reports, time]) => `
        <article class="service-card glass">
          <div>
            <div class="icon-wrap"><i class="fa-solid ${['fa-droplet', 'fa-trash', 'fa-road', 'fa-bus', 'fa-traffic-light', 'fa-lightbulb', 'fa-shield-heart', 'fa-tree'][0]}"></i></div>
            <h3>${name}</h3>
            <div class="status">${status}</div>
          </div>
          <div>
            <p>${reports}</p>
            <p>Avg response: ${time}</p>
          </div>
        </article>
      `).join('');
    }
  } catch (error) {
    console.error(error);
  }
}

async function renderTrendingConcerns() {
  const list = document.getElementById('trending-list');
  if (!list) return;
  list.innerHTML = [
    'Road repairs near Mira Road',
    'Waste collection around Borivali market',
    'Streetlight concerns in Bhayandar',
    'Water supply interruptions in Kandivali',
    'Public transport concerns on campus routes'
  ].map((item, index) => `
    <div class="trend-card glass"><strong>#${index + 1}</strong><p>${item}</p></div>
  `).join('');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2500);
}
