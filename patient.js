/**
 * Blood Bridge - Patient Search & Request Portal Controller
 * File: patient.js
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check auth state for navbar display
  const currentUser = StorageDB.getCurrentUser();
  const navAuthContainer = document.getElementById('patientNavAuth');

  if (currentUser && navAuthContainer) {
    const isHospital = currentUser.role === 'hospital';
    navAuthContainer.innerHTML = `
      <div class="user-profile-pill">
        <span class="user-role-badge ${isHospital ? 'hospital-badge' : ''}">${isHospital ? 'Hospital' : 'Patient'}</span>
        <span class="user-display-name">${StorageDB.escapeHtml(currentUser.name)}</span>
      </div>
      <a href="${isHospital ? 'hospital-dashboard.html' : 'patient-search.html'}" class="btn btn-sm ${isHospital ? 'btn-teal' : 'btn-primary'}">
        ${isHospital ? 'Inventory Command' : 'My Portal'}
      </a>
      <button class="btn btn-sm btn-outline" id="btnNavLogout">Logout</button>
    `;

    document.getElementById('btnNavLogout').addEventListener('click', () => {
      StorageDB.logout();
    });
  }

  // Populate City filter from existing hospitals in localStorage
  populateCityFilter();

  // Initial Render of Search Results
  renderHospitalResults();

  // Initial Render of Compatibility Widget
  renderCompatibilityChecker();

  // Render My Requests Count
  updateMyRequestsCount();

  // Filter change listeners
  document.getElementById('filterCity').addEventListener('change', renderHospitalResults);
  document.getElementById('filterComponent').addEventListener('change', renderHospitalResults);
  document.getElementById('filterBloodGroup').addEventListener('change', renderHospitalResults);

  // Reset Filters button
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    document.getElementById('filterCity').value = 'ALL';
    document.getElementById('filterComponent').value = 'Whole Blood';
    document.getElementById('filterBloodGroup').value = 'ALL';
    renderHospitalResults();
    StorageDB.showToast('Filters reset to default view.', 'info');
  });

  // Compatibility Select listener
  document.getElementById('compatBloodGroupSelect').addEventListener('change', renderCompatibilityChecker);

  // My Requests Modal button
  document.getElementById('btnOpenMyRequests').addEventListener('click', () => {
    const user = StorageDB.getCurrentUser();
    if (!user) {
      StorageDB.showToast('Please sign in to view and track your submitted blood requests.', 'info', 3000);
      setTimeout(() => {
        window.location.href = 'auth.html?role=patient&returnUrl=patient-search.html';
      }, 400);
      return;
    }
    renderMyRequestsModal();
    openModal('myRequestsModal');
  });

  // Reserve Request Form submission
  document.getElementById('reserveUnitsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleReserveFormSubmit();
  });

  // Check URL query parameters for pre-selected filters (e.g. ?group=O-&emergency=true)
  const urlParams = new URLSearchParams(window.location.search);
  const groupParam = urlParams.get('group');
  if (groupParam && BLOOD_GROUPS.includes(groupParam)) {
    document.getElementById('filterBloodGroup').value = groupParam;
    renderHospitalResults();
  }
  if (urlParams.get('emergency') === 'true') {
    document.getElementById('filterBloodGroup').value = 'O-';
    document.getElementById('filterComponent').value = 'Whole Blood';
    renderHospitalResults();
    StorageDB.showToast('Emergency mode active: prioritizing Universal Donor (O-) units.', 'warning', 5000);
  }

  // Check if redirected from login with a pending hospital reservation
  const hospIdParam = urlParams.get('hospId');
  if (hospIdParam && currentUser && currentUser.role === 'patient') {
    const targetHosp = StorageDB.getHospitalById(hospIdParam);
    if (targetHosp) {
      const compParam = urlParams.get('comp') || 'Whole Blood';
      const grpParam = urlParams.get('group') || (currentUser.bloodGroup && currentUser.bloodGroup !== 'Unknown' ? currentUser.bloodGroup : 'O+');
      setTimeout(() => {
        openReserveModal(targetHosp.id, targetHosp.name, grpParam, compParam);
        StorageDB.showToast(`Ready to request blood units from ${targetHosp.name}.`, 'info', 3000);
      }, 400);
    }
  }
});

// ----------------------------------------------------
// Filter Helpers
// ----------------------------------------------------

function populateCityFilter() {
  const hospitals = StorageDB.getHospitals();
  const citySelect = document.getElementById('filterCity');
  if (!citySelect) return;

  const cities = new Set();
  hospitals.forEach(h => {
    if (h.city) cities.add(h.city.trim());
  });

  cities.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    citySelect.appendChild(opt);
  });
}

// ----------------------------------------------------
// Render Hospital Stock Result Cards
// ----------------------------------------------------

function renderHospitalResults() {
  const selectedCity = document.getElementById('filterCity').value;
  const selectedComponent = document.getElementById('filterComponent').value;
  const selectedGroup = document.getElementById('filterBloodGroup').value;

  const allHospitals = StorageDB.getHospitals();
  const resultsContainer = document.getElementById('hospitalResultsList');
  const headingEl = document.getElementById('resultsHeading');
  const subheadingEl = document.getElementById('resultsSubheading');

  // Filter hospitals by city
  const filteredHospitals = allHospitals.filter(h => {
    if (selectedCity !== 'ALL' && h.city !== selectedCity) return false;
    return true;
  });

  if (headingEl) {
    headingEl.textContent = `Available Hospital Stock (${filteredHospitals.length} Facilities in Network)`;
  }
  if (subheadingEl) {
    subheadingEl.textContent = `Showing ${selectedComponent} &bull; ${selectedGroup === 'ALL' ? 'All Blood Groups' : 'Blood Group ' + selectedGroup}`;
  }

  if (filteredHospitals.length === 0) {
    resultsContainer.innerHTML = `
      <div style="background: #fff; border: 1px solid var(--border-slate); border-radius: 12px; padding: 40px; text-align: center;">
        <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-dark);">No Hospitals Found</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">No registered facilities match the selected city filter.</p>
        <button class="btn btn-outline" style="margin-top: 16px;" onclick="document.getElementById('btnResetFilters').click()">
          Clear All Filters
        </button>
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = filteredHospitals.map(hosp => {
    let unitsDisplay = 0;
    let badgeInfo = null;

    const compStock = (hosp.inventory && hosp.inventory[selectedComponent]) ? hosp.inventory[selectedComponent] : {};

    if (selectedGroup === 'ALL') {
      // Calculate total units across all 8 groups for this component
      let totalCompUnits = 0;
      BLOOD_GROUPS.forEach(g => {
        totalCompUnits += parseInt(compStock[g] || 0, 10);
      });
      unitsDisplay = totalCompUnits;
      badgeInfo = StorageDB.getStockBadge(unitsDisplay);
    } else {
      unitsDisplay = parseInt(compStock[selectedGroup] || 0, 10);
      badgeInfo = StorageDB.getStockBadge(unitsDisplay);
    }

    // Google Maps link
    const mapsQuery = encodeURIComponent(`${hosp.name} ${hosp.address || hosp.city}`);
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    return `
      <div class="hospital-result-card">
        <div class="hosp-card-top">
          <div class="hosp-info-primary">
            <h3>${StorageDB.escapeHtml(hosp.name)}</h3>
            <div class="hosp-location-text">
              &#128205; ${StorageDB.escapeHtml(hosp.address || hosp.city)}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
              License ID: <code>${StorageDB.escapeHtml(hosp.licenseId || 'VERIFIED')}</code>
            </div>
          </div>

          <div class="stock-indicator-box">
            <span class="stock-count-number">${unitsDisplay}</span>
            <span class="badge-status ${badgeInfo.badgeClass}">
              ${badgeInfo.label}
            </span>
            <small style="color: var(--text-subtle); margin-top: 2px;">
              ${selectedComponent} ${selectedGroup !== 'ALL' ? '(' + selectedGroup + ')' : '(Total)'}
            </small>
          </div>
        </div>

        <!-- 8 Groups Quick Inventory Mini Matrix if ALL is selected -->
        ${selectedGroup === 'ALL' ? `
          <div style="background-color: var(--bg-slate); border: 1px solid var(--border-slate); border-radius: 8px; padding: 10px 14px; display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; text-align: center;">
            ${BLOOD_GROUPS.map(grp => {
              const count = parseInt(compStock[grp] || 0, 10);
              const b = StorageDB.getStockBadge(count);
              return `
                <div style="display: flex; flex-direction: column; align-items: center;">
                  <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted);">${grp}</span>
                  <span style="font-size: 0.95rem; font-weight: 900; color: ${b.color};">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <div class="hosp-card-actions">
          <div class="hosp-updated-time">
            <span>&#9201;</span> Stock updated ${StorageDB.formatRelativeTime(hosp.lastUpdated)}
          </div>

          <div class="hosp-action-buttons">
            <a href="tel:${hosp.phone}" class="btn btn-sm btn-outline">
              <span>&#128222;</span> Call Hospital
            </a>
            <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
              <span>&#128506;</span> Directions
            </a>
            <button class="btn btn-sm btn-primary" onclick="openReserveModal('${hosp.id}', '${StorageDB.escapeHtml(hosp.name)}', '${selectedGroup === 'ALL' ? 'O+' : selectedGroup}', '${selectedComponent}')">
              <span>&#129656;</span> Request / Reserve Units
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------
// Interactive Blood Compatibility Checker
// ----------------------------------------------------

function renderCompatibilityChecker() {
  const selectedGroup = document.getElementById('compatBloodGroupSelect').value;
  const container = document.getElementById('compatResultsContainer');
  if (!container) return;

  const info = RBC_COMPATIBILITY[selectedGroup];
  if (!info) return;

  const isUniversalDonor = selectedGroup === 'O-';
  const isUniversalRecipient = selectedGroup === 'AB+';

  container.innerHTML = `
    <div>
      <div class="compat-section-title">Can Receive Red Blood Cells From:</div>
      <div class="compat-pills-row">
        ${BLOOD_GROUPS.map(grp => {
          const isCompatible = info.canReceiveFrom.includes(grp);
          return `
            <span class="compat-pill ${isCompatible ? 'highlight' : ''}">
              ${grp}
            </span>
          `;
        }).join('')}
      </div>
    </div>

    <div>
      <div class="compat-section-title">Can Donate Red Blood Cells To:</div>
      <div class="compat-pills-row">
        ${BLOOD_GROUPS.map(grp => {
          const isCompatible = info.canDonateTo.includes(grp);
          return `
            <span class="compat-pill ${isCompatible ? 'highlight' : ''}">
              ${grp}
            </span>
          `;
        }).join('')}
      </div>
    </div>

    ${isUniversalDonor ? `
      <div style="background: #fef2f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 8px 10px; font-size: 0.8rem; color: #991b1b; font-weight: 700;">
        &#9733; Universal RBC Donor: O- blood can be given to patients of ANY blood type in emergency trauma cases!
      </div>
    ` : ''}

    ${isUniversalRecipient ? `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px; font-size: 0.8rem; color: #166534; font-weight: 700;">
        &#9733; Universal RBC Recipient: AB+ patients can safely receive red blood cells from ANY blood group!
      </div>
    ` : ''}
  `;
}

// ----------------------------------------------------
// Request / Reserve Units Modal Handling
// ----------------------------------------------------

window.openReserveModal = function(hospId, hospName, defaultGroup, defaultComponent) {
  // Check if user is logged in
  const currentUser = StorageDB.getCurrentUser();
  if (!currentUser) {
    StorageDB.showToast('Please sign in or register as a patient to request blood units.', 'warning', 3500);
    setTimeout(() => {
      const returnParams = new URLSearchParams();
      returnParams.set('role', 'patient');
      returnParams.set('returnUrl', 'patient-search.html');
      returnParams.set('hospId', hospId);
      if (defaultGroup) returnParams.set('group', defaultGroup);
      if (defaultComponent) returnParams.set('comp', defaultComponent);
      returnParams.set('msg', 'login_required');
      window.location.href = `auth.html?${returnParams.toString()}`;
    }, 400);
    return;
  }

  // If logged in user is a hospital account, inform them to use a patient account
  if (currentUser.role !== 'patient') {
    StorageDB.showToast('You are currently logged in as a Hospital. Please sign in with a Patient account to make a blood request.', 'warning', 4000);
    setTimeout(() => {
      window.location.href = `auth.html?role=patient&returnUrl=patient-search.html&msg=login_required`;
    }, 600);
    return;
  }

  document.getElementById('modalTargetHospId').value = hospId;
  document.getElementById('modalTargetHospName').value = hospName;

  if (defaultGroup && defaultGroup !== 'ALL') {
    document.getElementById('modalBloodGroup').value = defaultGroup;
  }
  if (defaultComponent) {
    document.getElementById('modalComponent').value = defaultComponent;
  }

  // Pre-fill user data from logged in patient
  document.getElementById('modalPatientName').value = currentUser.name || '';
  document.getElementById('modalPatientPhone').value = currentUser.phone || currentUser.mobile || '';
  if (currentUser.bloodGroup && currentUser.bloodGroup !== 'Unknown') {
    document.getElementById('modalBloodGroup').value = currentUser.bloodGroup;
  }

  openModal('requestReserveModal');
};

function handleReserveFormSubmit() {
  const currentUser = StorageDB.getCurrentUser();
  if (!currentUser || currentUser.role !== 'patient') {
    StorageDB.showToast('Please sign in as a patient to submit this blood request.', 'danger');
    setTimeout(() => {
      window.location.href = 'auth.html?role=patient&returnUrl=patient-search.html&msg=login_required';
    }, 400);
    return;
  }

  const hospitalId = document.getElementById('modalTargetHospId').value;
  const hospitalName = document.getElementById('modalTargetHospName').value;
  const patientName = document.getElementById('modalPatientName').value.trim();
  const patientPhone = document.getElementById('modalPatientPhone').value.trim();
  const bloodGroup = document.getElementById('modalBloodGroup').value;
  const component = document.getElementById('modalComponent').value;
  const units = parseInt(document.getElementById('modalUnits').value, 10) || 1;
  const urgency = document.getElementById('modalUrgency').value;
  const notes = document.getElementById('modalNotes').value.trim();

  const newTicket = {
    hospitalId,
    hospitalName,
    patientName,
    patientPhone,
    patientEmail: currentUser.email || '',
    patientId: currentUser.id || 'pat_' + Date.now(),
    bloodGroup,
    component,
    units,
    urgency,
    notes
  };

  StorageDB.saveRequest(newTicket);
  closeModal('requestReserveModal');
  document.getElementById('reserveUnitsForm').reset();

  updateMyRequestsCount();

  StorageDB.showToast(
    `Request ticket #${newTicket.id.slice(-4)} successfully submitted to ${hospitalName}! The hospital has been alerted for approval.`,
    'success',
    6000
  );
}

// ----------------------------------------------------
// My Submitted Requests Tracking Modal
// ----------------------------------------------------

function updateMyRequestsCount() {
  const badge = document.getElementById('myRequestsBadgeCount');
  if (!badge) return;

  const currentUser = StorageDB.getCurrentUser();
  const allReqs = StorageDB.getRequests();

  let myCount = 0;
  if (currentUser) {
    myCount = allReqs.filter(r => r.patientEmail === currentUser.email || r.patientId === currentUser.id).length;
  } else {
    myCount = allReqs.length; // Show all community/demo requests if guest
  }
  badge.textContent = myCount;
}

function renderMyRequestsModal() {
  const container = document.getElementById('myRequestsModalBody');
  if (!container) return;

  const currentUser = StorageDB.getCurrentUser();
  const allReqs = StorageDB.getRequests();

  let myReqs = [];
  if (currentUser) {
    myReqs = allReqs.filter(r => r.patientEmail === currentUser.email || r.patientId === currentUser.id);
  } else {
    myReqs = allReqs; // Show available demo requests
  }

  if (myReqs.length === 0) {
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: var(--text-muted);">
        <p style="font-size: 1.1rem; font-weight: 700;">No requests submitted yet.</p>
        <small>When you submit a request ticket to any hospital, track its real-time approval status right here.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${myReqs.map(req => {
        let badgeHtml = '<span class="badge-status badge-low">Pending Hospital Review</span>';
        if (req.status === 'Approved') {
          badgeHtml = '<span class="badge-status badge-available">&#10003; Approved &amp; Units Reserved</span>';
        } else if (req.status === 'Declined') {
          badgeHtml = '<span class="badge-status badge-critical">&#10007; Declined</span>';
        }

        return `
          <div style="border: 1.5px solid var(--border-slate); border-radius: 8px; padding: 16px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <strong style="font-size: 1.05rem;">${StorageDB.escapeHtml(req.hospitalName)}</strong>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                  Ticket ID: <code>${req.id}</code> &bull; Patient: <strong>${StorageDB.escapeHtml(req.patientName)}</strong>
                </div>
              </div>
              ${badgeHtml}
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; background: var(--bg-slate); padding: 10px; border-radius: 6px; margin: 8px 0; font-size: 0.85rem;">
              <div>
                <span style="color: var(--text-subtle);">Group:</span> <strong>${req.bloodGroup}</strong>
              </div>
              <div>
                <span style="color: var(--text-subtle);">Component:</span> <strong>${req.component}</strong>
              </div>
              <div>
                <span style="color: var(--text-subtle);">Units:</span> <strong>${req.units} Bag(s)</strong>
              </div>
              <div>
                <span style="color: var(--text-subtle);">Urgency:</span> <strong>${req.urgency}</strong>
              </div>
            </div>

            ${req.status === 'Approved' ? `
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; color: #166534;">
                &#10003; <strong>Hospital Confirmation:</strong> Units have been reserved at the blood bank for patient crossmatching. Please visit with patient blood vial.
              </div>
            ` : ''}

            ${req.status === 'Declined' && req.declineReason ? `
              <div style="background: #fef2f2; border: 1px solid #fecdd3; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; color: #991b1b;">
                Reason: ${StorageDB.escapeHtml(req.declineReason)}
              </div>
            ` : ''}

            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 8px; text-align: right;">
              Submitted ${StorageDB.formatRelativeTime(req.createdAt)}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ----------------------------------------------------
// Global Modal Controls
// ----------------------------------------------------

window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
};

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
  }
});
