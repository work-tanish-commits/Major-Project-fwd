/**
 * Blood Bridge - Hospital Inventory Controller
 * File: hospital.js
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Route Protection
  const currentUser = StorageDB.getCurrentUser();
  if (!currentUser || currentUser.role !== 'hospital') {
    StorageDB.showToast('Please log in as an authorized hospital to access the inventory dashboard.', 'danger');
    setTimeout(() => {
      window.location.href = 'auth.html?role=hospital';
    }, 500);
    return;
  }

  // Load the freshest hospital record from database
  let currentHospital = StorageDB.getHospitalById(currentUser.id) || currentUser;
  let activeComponent = 'Whole Blood';

  // Initialize UI elements
  initHospitalHeader(currentHospital);
  initComponentTabs();
  renderInventoryGrid();
  renderIncomingRequests();
  updateOverviewStats();

  // Bind Logout
  document.getElementById('btnLogout').addEventListener('click', () => {
    StorageDB.logout();
  });

  // Bind CSV Export
  document.getElementById('btnDownloadCsv').addEventListener('click', () => {
    exportInventoryCsv(currentHospital);
  });

  // Bind Requests Refresh
  document.getElementById('btnRefreshRequests').addEventListener('click', () => {
    renderIncomingRequests();
    StorageDB.showToast('Requests refreshed from database.', 'info');
  });

  // ----------------------------------------------------
  // Helper Functions
  // ----------------------------------------------------

  function initHospitalHeader(hosp) {
    document.getElementById('hospNameTitle').textContent = hosp.name;
    document.getElementById('hospLicensePill').textContent = hosp.licenseId || 'LIC-VERIFIED';
    document.getElementById('hospDetailsLine').innerHTML = `
      City / Area: <strong>${StorageDB.escapeHtml(hosp.city)}</strong> &bull; 
      Emergency Phone: <strong><a href="tel:${hosp.phone}" style="color: #38bdf8;">${StorageDB.escapeHtml(hosp.phone)}</a></strong> &bull; 
      Official Email: <strong>${StorageDB.escapeHtml(hosp.email)}</strong>
    `;
  }

  function initComponentTabs() {
    const tabButtons = document.querySelectorAll('.comp-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeComponent = btn.getAttribute('data-component');
        renderInventoryGrid();
      });
    });
  }

  function renderInventoryGrid() {
    // Re-fetch hospital from localStorage to ensure state synchronization
    currentHospital = StorageDB.getHospitalById(currentHospital.id) || currentHospital;
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;

    if (!currentHospital.inventory) currentHospital.inventory = {};
    if (!currentHospital.inventory[activeComponent]) {
      currentHospital.inventory[activeComponent] = {};
      BLOOD_GROUPS.forEach(grp => {
        currentHospital.inventory[activeComponent][grp] = 0;
      });
    }

    const componentStock = currentHospital.inventory[activeComponent];

    grid.innerHTML = BLOOD_GROUPS.map(group => {
      const units = componentStock[group] !== undefined ? componentStock[group] : 0;
      const badge = StorageDB.getStockBadge(units);

      return `
        <div class="blood-group-card" id="card-${activeComponent.replace(/\s+/g, '')}-${group}">
          <div class="bg-card-header">
            <span class="blood-pill">${group}</span>
            <span class="badge-status ${badge.badgeClass}">
              ${badge.label}
            </span>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
            ${activeComponent}
          </div>

          <div class="stock-adjuster">
            <button type="button" class="btn-adjust" onclick="handleAdjustStock('${activeComponent}', '${group}', -1)" title="Decrease 1 unit">
              &minus;
            </button>
            <input 
              type="number" 
              class="stock-input" 
              id="input-${activeComponent.replace(/\s+/g, '')}-${group}" 
              value="${units}" 
              min="0" 
              max="999"
              onchange="handleDirectStockInput('${activeComponent}', '${group}', this.value)"
            />
            <button type="button" class="btn-adjust" onclick="handleAdjustStock('${activeComponent}', '${group}', 1)" title="Increase 1 unit">
              &#43;
            </button>
          </div>
        </div>
      `;
    }).join('');

    updateOverviewStats();
  }

  // Handle Quick +/- button clicks
  window.handleAdjustStock = function(component, group, delta) {
    if (!currentHospital.inventory) currentHospital.inventory = {};
    if (!currentHospital.inventory[component]) currentHospital.inventory[component] = {};

    const currentCount = parseInt(currentHospital.inventory[component][group] || 0, 10);
    const newCount = Math.max(0, currentCount + delta);

    StorageDB.updateHospitalInventory(currentHospital.id, component, group, newCount);
    currentHospital = StorageDB.getHospitalById(currentHospital.id);

    // Update input field and badge directly without full re-render for smooth experience
    const inputEl = document.getElementById(`input-${component.replace(/\s+/g, '')}-${group}`);
    if (inputEl) inputEl.value = newCount;

    const card = document.getElementById(`card-${component.replace(/\s+/g, '')}-${group}`);
    if (card) {
      const badgeEl = card.querySelector('.badge-status');
      const badge = StorageDB.getStockBadge(newCount);
      badgeEl.className = `badge-status ${badge.badgeClass}`;
      badgeEl.textContent = badge.label;
    }

    updateOverviewStats();
    StorageDB.showToast(`Updated ${group} (${component}) to ${newCount} units.`, 'info', 1800);
  };

  // Handle direct number input
  window.handleDirectStockInput = function(component, group, rawValue) {
    const newCount = Math.max(0, parseInt(rawValue, 10) || 0);
    StorageDB.updateHospitalInventory(currentHospital.id, component, group, newCount);
    currentHospital = StorageDB.getHospitalById(currentHospital.id);

    const card = document.getElementById(`card-${component.replace(/\s+/g, '')}-${group}`);
    if (card) {
      const badgeEl = card.querySelector('.badge-status');
      const badge = StorageDB.getStockBadge(newCount);
      badgeEl.className = `badge-status ${badge.badgeClass}`;
      badgeEl.textContent = badge.label;
    }

    updateOverviewStats();
    StorageDB.showToast(`Saved ${group} (${component}) stock: ${newCount} units.`, 'success', 2000);
  };

  function updateOverviewStats() {
    currentHospital = StorageDB.getHospitalById(currentHospital.id) || currentHospital;
    let totalUnits = 0;
    let criticalCount = 0;

    if (currentHospital.inventory) {
      Object.keys(currentHospital.inventory).forEach(comp => {
        Object.keys(currentHospital.inventory[comp] || {}).forEach(grp => {
          const count = parseInt(currentHospital.inventory[comp][grp], 10) || 0;
          totalUnits += count;
          if (count <= 2) {
            criticalCount++;
          }
        });
      });
    }

    const statUnitsEl = document.getElementById('statTotalUnits');
    const statCritEl = document.getElementById('statCriticalGroups');
    const statLastUpdatedEl = document.getElementById('statLastUpdated');

    if (statUnitsEl) statUnitsEl.textContent = totalUnits;
    if (statCritEl) statCritEl.textContent = criticalCount;
    if (statLastUpdatedEl) {
      statLastUpdatedEl.textContent = StorageDB.formatRelativeTime(currentHospital.lastUpdated);
    }
  }

  // ----------------------------------------------------
  // Incoming Patient Requests Management
  // ----------------------------------------------------

  function renderIncomingRequests() {
    const allRequests = StorageDB.getRequests();
    // Filter requests targeting this hospital (or general nearby requests)
    const hospRequests = allRequests.filter(r => 
      r.hospitalId === currentHospital.id || 
      (r.hospitalName && r.hospitalName.toLowerCase().includes(currentHospital.name.toLowerCase()))
    );

    const tbody = document.getElementById('requestsTableBody');
    const pendingBadge = document.getElementById('pendingRequestsCountBadge');
    const statPending = document.getElementById('statPendingRequests');

    const pendingCount = hospRequests.filter(r => r.status === 'Pending').length;
    if (pendingBadge) pendingBadge.textContent = `${pendingCount} Pending`;
    if (statPending) statPending.textContent = pendingCount;

    if (!tbody) return;

    if (hospRequests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-subtle);">
            No urgent patient requests on file for your hospital at this time.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = hospRequests.map(req => {
      let statusBadge = '<span class="badge-status badge-low">Pending</span>';
      if (req.status === 'Approved') {
        statusBadge = '<span class="badge-status badge-available">&#10003; Approved &amp; Reserved</span>';
      } else if (req.status === 'Declined') {
        statusBadge = '<span class="badge-status badge-critical">&#10007; Declined</span>';
      }

      let urgencyPill = '<span class="badge-status badge-available">Standard</span>';
      if (req.urgency === 'Critical Emergency') {
        urgencyPill = '<span class="badge-status badge-critical">&#9888; Critical Emergency</span>';
      } else if (req.urgency === 'Urgent') {
        urgencyPill = '<span class="badge-status badge-low">Urgent</span>';
      }

      return `
        <tr>
          <td>
            <strong>${StorageDB.escapeHtml(req.patientName)}</strong><br>
            <small style="color: var(--text-muted);">${StorageDB.escapeHtml(req.patientEmail || '')}</small>
            ${req.notes ? `<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-top: 4px;">"${StorageDB.escapeHtml(req.notes)}"</div>` : ''}
          </td>
          <td>
            <a href="tel:${req.patientPhone}" style="color: var(--primary-red); font-weight: 700; text-decoration: none;">
              ${StorageDB.escapeHtml(req.patientPhone)}
            </a>
          </td>
          <td>
            <span class="blood-pill" style="min-width: 38px; height: 30px; font-size: 0.85rem;">${req.bloodGroup}</span>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${req.component}</div>
          </td>
          <td><strong>${req.units} Unit(s)</strong></td>
          <td>${urgencyPill}</td>
          <td><small style="color: var(--text-subtle);">${StorageDB.formatRelativeTime(req.createdAt)}</small></td>
          <td>${statusBadge}</td>
          <td>
            ${req.status === 'Pending' ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-xs btn-success" onclick="handleApproveRequest('${req.id}')" title="Approve and automatically deduct units from inventory">
                  &#10003; Approve
                </button>
                <button class="btn btn-xs btn-danger" onclick="handleDeclineRequest('${req.id}')" title="Decline request">
                  &#10007; Decline
                </button>
              </div>
            ` : `
              <small style="color: var(--text-subtle);">Completed</small>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Handle Approve Request ticket (automatically deducts stock)
  window.handleApproveRequest = function(requestId) {
    const allRequests = StorageDB.getRequests();
    const req = allRequests.find(r => r.id === requestId);
    if (!req) return;

    currentHospital = StorageDB.getHospitalById(currentHospital.id);

    const comp = req.component;
    const grp = req.bloodGroup;
    const requestedUnits = parseInt(req.units, 10) || 1;

    // Check if hospital has inventory of this component and group
    const currentAvailable = (currentHospital.inventory && 
                              currentHospital.inventory[comp] && 
                              currentHospital.inventory[comp][grp] !== undefined) 
                              ? parseInt(currentHospital.inventory[comp][grp], 10) 
                              : 0;

    if (currentAvailable < requestedUnits) {
      StorageDB.showToast(
        `Insufficient stock! Requested ${requestedUnits} units of ${grp} ${comp}, but current stock is only ${currentAvailable} units.`,
        'danger',
        6000
      );
      return;
    }

    // Deduct units from inventory
    const updatedCount = currentAvailable - requestedUnits;
    StorageDB.updateHospitalInventory(currentHospital.id, comp, grp, updatedCount);

    // Update Request status to 'Approved'
    StorageDB.updateRequestStatus(requestId, 'Approved');

    // Re-render UI
    renderInventoryGrid();
    renderIncomingRequests();

    StorageDB.showToast(
      `Request approved! Successfully allocated ${requestedUnits} unit(s) of ${grp} ${comp} for patient ${req.patientName}. Inventory updated.`,
      'success',
      5000
    );
  };

  // Handle Decline Request ticket
  window.handleDeclineRequest = function(requestId) {
    const reason = prompt('Please specify a brief reason for declining this blood request (optional):') || 'Units temporarily reserved for scheduled ICU surgeries';
    StorageDB.updateRequestStatus(requestId, 'Declined', reason);
    renderIncomingRequests();
    StorageDB.showToast('Request ticket marked as Declined.', 'info');
  };

  // ----------------------------------------------------
  // Export Feature: Download Inventory CSV
  // ----------------------------------------------------

  function exportInventoryCsv(hospital) {
    currentHospital = StorageDB.getHospitalById(hospital.id) || hospital;
    const rows = [];

    // Header info
    rows.push(['Blood Bridge - Hospital Inventory Audit Report']);
    rows.push(['Hospital Name', `"${currentHospital.name}"`]);
    rows.push(['License ID', currentHospital.licenseId || 'N/A']);
    rows.push(['Location', `"${currentHospital.city}"`]);
    rows.push(['Contact Number', currentHospital.phone]);
    rows.push(['Report Generated At', new Date().toLocaleString()]);
    rows.push([]);

    // Table Header
    rows.push(['Component Type', 'Blood Group', 'Units In Stock', 'Stock Status']);

    if (currentHospital.inventory) {
      BLOOD_COMPONENTS.forEach(comp => {
        BLOOD_GROUPS.forEach(grp => {
          const units = (currentHospital.inventory[comp] && currentHospital.inventory[comp][grp] !== undefined)
            ? currentHospital.inventory[comp][grp]
            : 0;
          const badge = StorageDB.getStockBadge(units);
          rows.push([comp, grp, units, badge.level.toUpperCase()]);
        });
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeHospName = currentHospital.name.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `BloodBridge_Inventory_${safeHospName}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    StorageDB.showToast('Inventory CSV Report downloaded successfully.', 'success');
  }
});