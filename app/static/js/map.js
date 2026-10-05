document.addEventListener('DOMContentLoaded', async () => {
  const mapContainer = document.getElementById('city-map');
  const listView = document.getElementById('issue-list-view');
  const issueSearch = document.getElementById('issue-search');
  const categoryFilter = document.getElementById('filter-category');
  const statusFilter = document.getElementById('filter-status');
  const priorityFilter = document.getElementById('filter-priority');
  const areaFilter = document.getElementById('filter-area');

  const map = L.map('city-map').setView([19.27, 72.85], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  async function loadIssues() {
    const issues = await fetch('/api/issues').then((res) => res.json());
    const categories = [...new Set(issues.map((issue) => issue.category))];
    const statuses = [...new Set(issues.map((issue) => issue.status))];
    const priorities = [...new Set(issues.map((issue) => issue.priority))];
    const areas = [...new Set(issues.map((issue) => issue.area))];

    populateSelect(categoryFilter, categories);
    populateSelect(statusFilter, statuses);
    populateSelect(priorityFilter, priorities);
    populateSelect(areaFilter, areas);

    const filtered = filterIssues(issues);
    renderIssueList(filtered);
    renderMapPins(filtered);
    return issues;
  }

  function populateSelect(select, values) {
    if (!select) return;
    select.innerHTML = `<option value="">${select.id.includes('category') ? 'Category' : select.id.includes('status') ? 'Status' : select.id.includes('priority') ? 'Priority' : 'Area'}</option>` + values.map((value) => `<option value="${value}">${value}</option>`).join('');
  }

  function filterIssues(issues) {
    const search = (issueSearch?.value || '').trim().toLowerCase();
    return issues.filter((issue) => {
      const matchesSearch = !search || `${issue.title} ${issue.area} ${issue.category}`.toLowerCase().includes(search);
      const matchesCategory = !categoryFilter.value || issue.category === categoryFilter.value;
      const matchesStatus = !statusFilter.value || issue.status === statusFilter.value;
      const matchesPriority = !priorityFilter.value || issue.priority === priorityFilter.value;
      const matchesArea = !areaFilter.value || issue.area === areaFilter.value;
      return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesArea;
    });
  }

  function renderIssueList(issues) {
    if (!listView) return;
    listView.innerHTML = issues.map((issue) => `
      <div class="issue-row glass">
        <div>
          <strong>${issue.title}</strong>
          <small>${issue.ticket_id} • ${issue.area}</small>
        </div>
        <div><small>Category</small><br /><span>${issue.category}</span></div>
        <div><small>Department</small><br /><span>${issue.department || 'N/A'}</span></div>
        <div><small>Priority</small><br /><span class="badge">${issue.priority}</span></div>
        <div><small>Status</small><br /><span class="status-chip">${issue.status}</span></div>
        <div><small>Support</small><br /><span>${issue.support_count}</span></div>
      </div>
    `).join('') || '<div class="glass" style="padding:20px; border-radius:18px;">No issues match your filters.</div>';
  }

  function renderMapPins(issues) {
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) layer.remove();
    });

    issues.forEach((issue) => {
      if (!issue.latitude || !issue.longitude) return;
      const priorityColors = {
        Low: '#34d399',
        Medium: '#fbbf24',
        High: '#fb7185',
        Critical: '#ef4444'
      };
      const marker = L.circleMarker([issue.latitude, issue.longitude], {
        radius: 11,
        color: priorityColors[issue.priority] || '#5ee7ff',
        fillColor: priorityColors[issue.priority] || '#5ee7ff',
        fillOpacity: 0.9,
        weight: 2
      });
      marker.bindPopup(`<strong>${issue.title}</strong><br/>Ticket: ${issue.ticket_id}<br/>Location: ${issue.area}<br/>Priority: ${issue.priority}<br/>Status: ${issue.status}<br/>Supporters: ${issue.support_count}<br/><a href="/issue/${issue.id}">VIEW REPORT →</a>`);
      marker.addTo(map);
    });
  }

  const toggleButtons = document.querySelectorAll('[data-view]');
  const mapPanel = document.getElementById('issue-map-view');
  toggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      toggleButtons.forEach((b) => b.classList.toggle('active', b === button));
      const isMap = button.dataset.view === 'map';
      listView.classList.toggle('hidden', isMap);
      mapPanel.classList.toggle('hidden', !isMap);
      if (isMap) setTimeout(() => map.invalidateSize(), 200);
    });
  });

  [issueSearch, categoryFilter, statusFilter, priorityFilter, areaFilter].forEach((control) => {
    control?.addEventListener('input', () => {
      loadIssues();
    });
    control?.addEventListener('change', () => {
      loadIssues();
    });
  });

  loadIssues();
});
