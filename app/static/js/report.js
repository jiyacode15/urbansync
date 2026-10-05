document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('report-form');
  const useLocationBtn = document.getElementById('use-location-btn');
  const duplicateModal = document.getElementById('duplicateModal');
  const duplicateList = document.getElementById('duplicateList');
  const reportAnywayBtn = document.getElementById('report-anyway-btn');
  const viewExistingBtn = document.getElementById('view-existing-btn');
  const imageInput = document.getElementById('imageUpload');
  const imagePreview = document.getElementById('imagePreview');
  const closeModal = document.querySelector('.close-modal');
  let pendingPayload = null;

  useLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported on this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      document.getElementById('latitude').value = position.coords.latitude;
      document.getElementById('longitude').value = position.coords.longitude;
      showToast('Location captured.');
    }, () => showToast('Location access was denied. You can still enter manually.'));
  });

  imageInput.addEventListener('change', () => {
    const [file] = imageInput.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Issue preview" />`;
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      category: document.getElementById('category').value,
      area: document.getElementById('area').value,
      landmark: document.getElementById('landmark').value,
      latitude: document.getElementById('latitude').value || null,
      longitude: document.getElementById('longitude').value || null,
      priority: document.getElementById('priority').value,
      citizen_name: document.getElementById('citizen_name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
    };

    const baseResponse = await fetch('/api/issues');
    const issues = await baseResponse.json();
    const similar = issues.filter((issue) => {
      if (issue.category !== payload.category) return false;
      if (issue.area.toLowerCase() !== payload.area.toLowerCase()) return false;
      const haystack = `${issue.title} ${issue.description}`.toLowerCase();
      const searchText = payload.title.toLowerCase();
      return haystack.includes(searchText) || searchText.includes(issue.title.toLowerCase());
    });

    if (similar.length) {
      duplicateList.innerHTML = similar.slice(0, 3).map((issue) => `
        <div class="duplicate-item glass">
          <strong>${issue.title}</strong>
          <p>${issue.area} • ${issue.status}</p>
          <a href="/issue/${issue.id}">VIEW EXISTING REPORT</a>
        </div>
      `).join('');
      pendingPayload = payload;
      duplicateModal.classList.remove('hidden');
      return;
    }

    submitIssue(payload);
  });

  reportAnywayBtn.addEventListener('click', () => {
    duplicateModal.classList.add('hidden');
    submitIssue(pendingPayload);
  });

  viewExistingBtn.addEventListener('click', () => {
    duplicateModal.classList.add('hidden');
    showToast('Review the matching report before continuing.');
  });

  closeModal.addEventListener('click', () => duplicateModal.classList.add('hidden'));

  async function submitIssue(payload) {
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Issue submission failed.');
      }
      const issue = data.issue;
      showSuccessModal(data.ticket_id, issue.priority, data.department, issue.title);
      form.reset();
      imagePreview.innerHTML = '';
    } catch (error) {
      showToast(error.message || 'Unable to submit issue.');
    }
  }

  function showSuccessModal(ticketId, priority, department, title) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-card glass">
        <button class="close-modal" type="button">×</button>
        <span class="section-tag">REPORT RECEIVED</span>
        <h3>${title}</h3>
        <div class="detail-meta">
          <div><strong>Ticket</strong><span>${ticketId}</span></div>
          <div><strong>Priority</strong><span>${priority}</span></div>
          <div><strong>Assigned Department</strong><span>${department}</span></div>
          <div><strong>Status</strong><span>Reported</span></div>
        </div>
        <p>Your report has entered the UrbanSync service network.</p>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    setTimeout(() => modal.remove(), 6000);
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
});
