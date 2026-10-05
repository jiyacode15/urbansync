document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  populateHomeMetrics();
  populateInsights();
  populateFeaturedIssues();
  populateServices();
  populatePoll();
  animateCounters();
});

function setupNavigation() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
      navMenu.style.flexDirection = 'column';
      navMenu.style.position = 'absolute';
      navMenu.style.top = '70px';
      navMenu.style.right = '20px';
      navMenu.style.padding = '18px';
      navMenu.style.borderRadius = '16px';
      navMenu.style.background = 'rgba(9,15,24,0.95)';
      navMenu.style.border = '1px solid rgba(255,255,255,0.08)';
    });
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function animateCounters() {
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const target = Number(el.dataset.counter);
    let count = 0;
    const step = Math.max(1, Math.ceil(target / 50));
    const timer = setInterval(() => {
      count += step;
      if (count >= target) {
        count = target;
        clearInterval(timer);
      }
      el.textContent = `${count}${target === 91 ? '%' : ''}`;
    }, 20);
  });
}

async function populateHomeMetrics() {
  const openIssues = document.getElementById('stat-open');
  if (!openIssues) return;
  try {
    const stats = await fetchJson('/api/dashboard/stats');
    openIssues.textContent = stats.open_issues ?? 0;
    document.getElementById('stat-resolved').textContent = stats.resolved_today ?? 0;
    document.getElementById('stat-response').textContent = `${stats.average_response_time_hours ?? 0}h`;
    document.getElementById('stat-satisfaction').textContent = `${stats.citizen_satisfaction ?? 91}%`;
    document.getElementById('stat-services').textContent = 8;
  } catch (error) {
    console.error(error);
  }
}

async function populateInsights() {
  try {
    const data = await fetchJson('/api/analytics');
    const insightList = document.getElementById('insight-list');
    if (!insightList || !data.intelligence) return;
    insightList.innerHTML = data.intelligence.map((item) => `
      <article class="insight-item glass"><p>${item}</p></article>
    `).join('');
  } catch (error) {
    console.error(error);
  }
}

async function populateFeaturedIssues() {
  try {
    const issues = await fetchJson('/api/issues');
    const list = document.getElementById('featured-issues');
    if (!list) return;
    const items = issues.slice(0, 6).map((issue) => `
      <article class="issue-card glass">
        <div class="issue-card-header">
          <span class="badge">${issue.ticket_id}</span>
          <span class="status-chip">${issue.status}</span>
        </div>
        <div>
          <div class="issue-card-title">${issue.title}</div>
          <div class="issue-meta">
            <span>${issue.area}</span>
            <span>${issue.category}</span>
          </div>
        </div>
        <div class="issue-meta">
          <span>${issue.department || 'Department'}</span>
          <span>${issue.priority}</span>
        </div>
        <div class="issue-footer">
          <span>${issue.support_count} supporters</span>
          <a href="/issue/${issue.id}" class="primary-btn">View</a>
        </div>
      </article>
    `).join('');
    list.innerHTML = items;
  } catch (error) {
    console.error(error);
  }
}

async function populateServices() {
  try {
    const departments = await fetchJson('/api/departments');
    const servicesGrid = document.getElementById('services-overview');
    if (!servicesGrid) return;
    const names = [
      { name: 'Water Supply', status: 'Operational', reports: '12 active reports', time: 'Avg response: 4.2 hrs' },
      { name: 'Waste Management', status: 'Operational', reports: '18 active reports', time: 'Avg response: 2.8 hrs' },
      { name: 'Road Maintenance', status: 'Monitoring', reports: '21 active reports', time: 'Avg response: 6.1 hrs' },
      { name: 'Public Transport', status: 'Stable', reports: '9 active reports', time: 'Avg response: 3.5 hrs' },
      { name: 'Traffic Management', status: 'Adaptive', reports: '14 active reports', time: 'Avg response: 5.2 hrs' },
      { name: 'Street Lighting', status: 'Operational', reports: '11 active reports', time: 'Avg response: 3.1 hrs' },
      { name: 'Public Safety', status: 'Priority', reports: '7 active reports', time: 'Avg response: 2.4 hrs' },
      { name: 'Parks & Recreation', status: 'Healthy', reports: '6 active reports', time: 'Avg response: 7.8 hrs' }
    ];
    servicesGrid.innerHTML = names.map((service, index) => {
      const dept = departments[index] || {};
      return `
        <article class="service-card glass">
          <div>
            <div class="icon-wrap"><i class="fa-solid ${['fa-droplet', 'fa-trash', 'fa-road', 'fa-bus', 'fa-traffic-light', 'fa-lightbulb', 'fa-shield-heart', 'fa-tree'][index]}"></i></div>
            <h3>${service.name}</h3>
            <div class="status">${service.status}</div>
          </div>
          <div>
            <p>${service.reports}</p>
            <p>${dept.avg_response_hours ? `Avg response: ${dept.avg_response_hours} hrs` : service.time}</p>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    console.error(error);
  }
}

async function populatePoll() {
  try {
    const pollData = await fetchJson('/api/polls');
    const container = document.getElementById('poll-container');
    if (!container || !pollData.length) return;
    const poll = pollData[0];
    container.innerHTML = `
      <div class="poll-card glass">
        <h3>${poll.question}</h3>
        <div class="poll-options">
          ${poll.results.options.map((option) => `
            <div class="option-row">
              <button type="button" data-option-id="${option.id}">${option.text}</button>
              <div class="vote-meter">
                <span>${option.percentage}%</span>
                <div class="bar-shell"><span style="width:${option.percentage}%"></span></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    container.querySelectorAll('button[data-option-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          const res = await fetch(`/api/polls/${poll.id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ option_id: Number(button.dataset.optionId) })
          });
          if (!res.ok) throw new Error('Vote failed');
          const result = await res.json();
          showToast('Vote recorded.');
          if (result.results) {
            populatePoll();
          }
        } catch (error) {
          showToast('Unable to cast vote.');
        }
      });
    });
  } catch (error) {
    console.error(error);
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2500);
}
