// --- Configuration & State ---
const state = {
  tasks: [],
  resources: [], // {id, name, roleName}
  scale: "day", // day, week, month
  pxPerUnit: 40, // pixels per day (base)
  zoomLevel: 1,
  showWeekends: true,
  startDate: new Date(),
  endDate: new Date(),
  totalDays: 0,
};

const DOM = {
  fileInput: document.getElementById("file-input"),
  btnExample: document.getElementById("btn-example"),
  linkExample: document.getElementById("link-example"),
  emptyState: document.getElementById("empty-state"),
  taskPanel: document.getElementById("task-panel"),
  timelinePanel: document.getElementById("timeline-panel"),
  taskList: document.getElementById("task-list"),
  timelineHeader: document.getElementById("timeline-header"),
  timelineHeaderContent: document.getElementById(
    "timeline-header-content"
  ),
  timelineBody: document.getElementById("timeline-body"),
  timelineGrid: document.getElementById("timeline-grid"),
  gridBg: document.getElementById("grid-bg"),
  todayMarker: document.getElementById("today-marker"),
  tooltip: document.getElementById("tooltip"),
  search: document.getElementById("search"),
  btnFit: document.getElementById("btn-fit"),
  btnZoomIn: document.getElementById("btn-zoom-in"),
  btnZoomOut: document.getElementById("btn-zoom-out"),
  btnToggleWeekend: document.getElementById("btn-toggle-weekend"),
  scaleBtns: document.querySelectorAll("[data-scale]"),
  // Modal
  modal: document.getElementById("edit-modal"),
  editId: document.getElementById("edit-id"),
  editName: document.getElementById("edit-name"),
  editStart: document.getElementById("edit-start"),
  editDuration: document.getElementById("edit-duration"),
  editProgress: document.getElementById("edit-progress"),
  editCost: document.getElementById("edit-cost"),
  editResList: document.getElementById("edit-resources-list"),
};

const HIDDEN_CLASS = "is-hidden";

// --- Utils ---
const ONE_DAY = 24 * 60 * 60 * 1000;
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function diffDays(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / ONE_DAY);
}
function getWeekNumber(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        (week1.getDay() + 6) % 7) /
        7
    )
  );
}
function fmtDateInput(d) {
  return d.toISOString().split("T")[0];
}

// --- Core Logic ---

async function loadGanFile(text) {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    if (xml.querySelector("parsererror")) throw new Error("XML invalide");

    // Parse Roles
    const roleMap = new Map();
    xml.querySelectorAll("roles > role").forEach(r => {
      roleMap.set(r.getAttribute("id"), r.getAttribute("name"));
    });

    // Parse Resources
    const resMap = new Map();
    const resources = [];
    xml.querySelectorAll("resources > resource").forEach((r) => {
      const id = r.getAttribute("id");
      const name = r.getAttribute("name");
      const func = r.getAttribute("function"); // e.g. "Default:1"
      let roleName = "Intervenant";
      if(func && func.startsWith("Default:")) {
          const roleId = func.split(":")[1];
          if(roleMap.has(roleId)) roleName = roleMap.get(roleId);
      }
      resMap.set(id, {name, roleName});
      resources.push({ id, name, roleName });
    });
    state.resources = resources;

    // Parse Allocations
    const allocs = [];
    xml.querySelectorAll("allocations > allocation").forEach((a) => {
      allocs.push({
        taskId: a.getAttribute("task-id"),
        resourceId: a.getAttribute("resource-id"),
        load: parseFloat(a.getAttribute("load") || "100"),
        responsible: a.getAttribute("responsible") === "true"
      });
    });

    // Parse Tasks (Recursive to get Phase)
    const tasks = [];
    let minDate = null;
    let maxDate = null;

    const rootTasks = xml.querySelectorAll("tasks > task");

    rootTasks.forEach(phaseNode => {
        const phaseName = phaseNode.getAttribute("name");
        const childNodes = phaseNode.querySelectorAll("task");

        if(childNodes.length === 0) {
            // Top level task without children (unlikely in this specific file but possible)
            // Treat as phase = itself
            parseTaskNode(phaseNode, phaseName, tasks, allocs, resMap);
        } else {
            // It's a phase container
            childNodes.forEach(childNode => {
                parseTaskNode(childNode, phaseName, tasks, allocs, resMap);
            });
        }
    });

    function parseTaskNode(t, phaseName, tasksList, allocs, resMap) {
      const id = t.getAttribute("id");
      const name = t.getAttribute("name");
      const startStr = t.getAttribute("start");
      const duration = parseInt(t.getAttribute("duration") || "1", 10);
      const complete = parseInt(t.getAttribute("complete") || "0", 10);
      const color = t.getAttribute("color") || "#3b82f6";

      if (!startStr) return; 

      const start = startOfDay(new Date(startStr));
      const end = addDays(start, duration);

      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;

      // Find resources
      const taskAllocs = allocs.filter((a) => a.taskId === id);
      const taskResources = taskAllocs.map((a) => {
          const r = resMap.get(a.resourceId);
          return {
              id: a.resourceId,
              name: r ? r.name : "Unknown",
              roleName: r ? r.roleName : "",
              load: a.load,
              responsible: a.responsible
          };
      });

      // Determine primary responsible role for display
      let responsibleRole = "-";
      const respRes = taskResources.find(r => r.responsible) || taskResources[0];
      if(respRes) responsibleRole = respRes.roleName;

      // Dependencies
      const depends = [];
      t.querySelectorAll("depend").forEach(d => {
          depends.push(d.getAttribute("id"));
      });

      tasksList.push({
        id,
        phase: phaseName,
        name,
        start,
        end,
        duration,
        complete,
        color,
        resources: taskResources,
        responsibleRole,
        depends,
        cost: 0, 
      });
    }

    // Sort by start date
    tasks.sort((a, b) => a.start - b.start);

    // Update State
    state.tasks = tasks;
    state.startDate = addDays(minDate || new Date(), -7); // Buffer
    state.endDate = addDays(maxDate || new Date(), 14); // Buffer
    state.totalDays = diffDays(state.startDate, state.endDate);

    renderApp();
    DOM.emptyState.classList.add(HIDDEN_CLASS);
    DOM.taskPanel.classList.remove(HIDDEN_CLASS);
    DOM.timelinePanel.classList.remove(HIDDEN_CLASS);

    // Auto fit
    fitView();
  } catch (e) {
    console.error(e);
    alert("Erreur lors de la lecture du fichier .gan");
  }
}

function renderApp() {
  renderTaskList();
  renderTimeline();
}

function getFilteredTasks() {
  const filter = DOM.search.value.toLowerCase().trim();
  if (!filter) return state.tasks;
  return state.tasks.filter(
    (t) =>
      t.name.toLowerCase().includes(filter) ||
      t.phase.toLowerCase().includes(filter) ||
      String(t.id).toLowerCase().includes(filter)
  );
}

function renderTaskList() {
  DOM.taskList.innerHTML = "";
  const tasks = getFilteredTasks();

  tasks.forEach((t, index) => {
    const el = document.createElement("div");
    el.className = "task-item";
    el.dataset.id = t.id;

    // Columns: #, ID, Phase, Task, Resp, Dur
    el.innerHTML = `
      <span class="id-badge">${index + 1}</span>
      <div style="font-size:0.75rem; color:var(--text-muted);">${t.id}</div>
      <div style="font-weight:500; color:var(--primary);">${t.phase}</div>
      <div style="font-weight:600;">${t.name}</div>
      <div style="font-size:0.75rem; color:var(--secondary);">${t.responsibleRole}</div>
      <div style="text-align:right; font-size:0.8rem; color:var(--text-muted);">${t.duration}j</div>
    `;
    el.addEventListener("click", () => openEditModal(t));
    el.addEventListener("mouseenter", () => highlightTask(t.id, true));
    el.addEventListener("mouseleave", () => highlightTask(t.id, false));
    DOM.taskList.appendChild(el);
  });
}

function getPxPerDay() {
  if (state.scale === "day") return state.pxPerUnit * state.zoomLevel;
  if (state.scale === "week")
    return (state.pxPerUnit * state.zoomLevel) / 7;
  if (state.scale === "month")
    return (state.pxPerUnit * state.zoomLevel) / 30;
  return 20;
}

function renderTimeline() {
  const tasks = getFilteredTasks();
  const pxPerDay = getPxPerDay();
  const totalWidth = state.totalDays * pxPerDay;
  const rowHeight = 44; // CSS var --row-height

  // 1. Setup Grid Dimensions
  DOM.timelineHeaderContent.style.width = totalWidth + "px";
  DOM.timelineGrid.style.width = totalWidth + "px";
  DOM.timelineGrid.style.height = tasks.length * rowHeight + "px";

  // 2. Render Scales (Header)
  renderHeaderScales(pxPerDay);

  // 3. Render Grid Background (Vertical Lines)
  renderGridBackground(pxPerDay, totalWidth, tasks.length);

  // 4. Render Bars & Dependencies
  renderBars(pxPerDay, rowHeight, tasks);

  // 5. Today Marker
  const today = new Date();
  if (today >= state.startDate && today <= state.endDate) {
    const daysFromStart = diffDays(state.startDate, today);
    DOM.todayMarker.style.display = "block";
    DOM.todayMarker.style.left = daysFromStart * pxPerDay + "px";
  } else {
    DOM.todayMarker.style.display = "none";
  }
}

function renderHeaderScales(pxPerDay) {
  DOM.timelineHeaderContent.innerHTML = "";

  const primaryRow = document.createElement("div");
  primaryRow.className = "time-scale-primary";
  const secondaryRow = document.createElement("div");
  secondaryRow.className = "time-scale-secondary";

  DOM.timelineHeaderContent.appendChild(primaryRow);
  DOM.timelineHeaderContent.appendChild(secondaryRow);

  let currentMonth = -1;

  if (state.scale === "day") {
    for (let i = 0; i < state.totalDays; i++) {
      const d = addDays(state.startDate, i);
      const dayCell = document.createElement("div");
      dayCell.className = "scale-cell";
      dayCell.style.left = i * pxPerDay + "px";
      dayCell.style.width = pxPerDay + "px";
      dayCell.textContent = d.getDate();
      if (d.getDay() === 0 || d.getDay() === 6)
        dayCell.style.background = "var(--weekend-color)";
      secondaryRow.appendChild(dayCell);

      if (d.getMonth() !== currentMonth) {
        currentMonth = d.getMonth();
        const monthLabel = d.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
        const mDiv = document.createElement("div");
        mDiv.className = "scale-cell";
        mDiv.style.left = i * pxPerDay + "px";
        mDiv.style.justifyContent = "flex-start";
        mDiv.style.paddingLeft = "8px";
        mDiv.style.borderRight = "none";
        mDiv.textContent = monthLabel;
        primaryRow.appendChild(mDiv);
      }
    }
  } else if (state.scale === "week") {
    const weekWidth = pxPerDay * 7;
    for (let i = 0; i < state.totalDays; i += 7) {
      const d = addDays(state.startDate, i);
      const wNum = getWeekNumber(d);
      const wCell = document.createElement("div");
      wCell.className = "scale-cell";
      wCell.style.left = i * pxPerDay + "px";
      wCell.style.width = weekWidth + "px";
      wCell.textContent = "S" + wNum;
      secondaryRow.appendChild(wCell);

      if (d.getMonth() !== currentMonth) {
        currentMonth = d.getMonth();
        const monthLabel = d.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        });
        const mDiv = document.createElement("div");
        mDiv.className = "scale-cell";
        mDiv.style.left = i * pxPerDay + "px";
        mDiv.style.justifyContent = "flex-start";
        mDiv.style.paddingLeft = "8px";
        mDiv.style.borderRight = "none";
        mDiv.textContent = monthLabel;
        primaryRow.appendChild(mDiv);
      }
    }
  } else {
    const monthWidth = pxPerDay * 30;
    for (let i = 0; i < state.totalDays; i += 30) {
      const d = addDays(state.startDate, i);
      const mCell = document.createElement("div");
      mCell.className = "scale-cell";
      mCell.style.left = i * pxPerDay + "px";
      mCell.style.width = monthWidth + "px";
      mCell.textContent = d.toLocaleDateString("fr-FR", {
        month: "short",
      });
      secondaryRow.appendChild(mCell);

      const yDiv = document.createElement("div");
      yDiv.className = "scale-cell";
      yDiv.style.left = i * pxPerDay + "px";
      yDiv.style.width = monthWidth + "px";
      yDiv.style.borderRight = "none";
      yDiv.textContent = d.getFullYear();
      primaryRow.appendChild(yDiv);
    }
  }
}

function renderGridBackground(pxPerDay, totalWidth, rowCount = state.tasks.length) {
  DOM.gridBg.innerHTML = "";
  let step = 1;
  if (state.scale === "week") step = 7;
  if (state.scale === "month") step = 30;

  for (let i = 0; i < state.totalDays; i += step) {
    const line = document.createElement("div");
    line.className = "grid-col";
    line.style.left = i * pxPerDay + "px";
    line.style.width = step * pxPerDay + "px";
    if (state.scale === "day" && state.showWeekends) {
      const d = addDays(state.startDate, i);
      if (d.getDay() === 0 || d.getDay() === 6)
        line.classList.add("weekend");
    }
    DOM.gridBg.appendChild(line);
  }

  for (let idx = 0; idx < rowCount; idx += 1) {
    const hLine = document.createElement("div");
    hLine.className = "grid-row-line";
    hLine.style.top = (idx + 1) * 44 + "px";
    DOM.gridBg.appendChild(hLine);
  }
}

function renderBars(pxPerDay, rowHeight, tasks) {
  const existingBars = DOM.timelineGrid.querySelectorAll(".gantt-bar, .dependency-line, .dependency-arrow");
  existingBars.forEach((b) => b.remove());

  // Map for dependency drawing
  const taskPositions = new Map();

  tasks.forEach((t, idx) => {
    const daysFromStart = diffDays(state.startDate, t.start);
    const durationDays = t.duration;

    const bar = document.createElement("div");
    bar.className = "gantt-bar";
    bar.dataset.id = t.id;

    const x = daysFromStart * pxPerDay;
    const w = durationDays * pxPerDay;
    const y = idx * rowHeight + 10;
    const h = 24;

    bar.style.left = x + "px";
    bar.style.top = y + "px";
    bar.style.width = Math.max(w, 4) + "px";

    // Color by Phase
    if(t.phase === "Conception") bar.style.backgroundColor = "#3b82f6";
    else if(t.phase === "Hardware") bar.style.backgroundColor = "#10b981";
    else if(t.phase === "Software") bar.style.backgroundColor = "#8b5cf6";
    else if(t.phase === "Indus & Certif") bar.style.backgroundColor = "#f59e0b";
    else bar.style.backgroundColor = t.color;

    if (t.complete > 0) {
      const prog = document.createElement("div");
      prog.className = "gantt-bar-progress";
      prog.style.width = t.complete + "%";
      bar.appendChild(prog);
    }

    // Resource Label
    const label = document.createElement("div");
    label.className = "gantt-bar-text";
    label.textContent = t.responsibleRole;
    bar.appendChild(label);

    bar.addEventListener("click", () => openEditModal(t));
    bar.addEventListener("mouseenter", (e) => {
      showTooltip(e, t);
      highlightTask(t.id, true);
    });
    bar.addEventListener("mouseleave", () => {
      hideTooltip();
      highlightTask(t.id, false);
    });

    DOM.timelineGrid.appendChild(bar);

    // Store position for dependencies
    taskPositions.set(t.id, {x, y, w, h});
  });

  // Draw Dependencies
  tasks.forEach(t => {
      if(t.depends && t.depends.length > 0) {
          const targetPos = taskPositions.get(t.id);
          if(!targetPos) return;

          t.depends.forEach(depId => {
              const sourcePos = taskPositions.get(depId);
              if(sourcePos) {
                  drawDependency(sourcePos, targetPos);
              }
          });
      }
  });
}

function drawDependency(from, to) {
    // Simple L-shape or straight line
    // From right-center of source to left-center of target
    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;

    // If target is after source, simple line
    // We will just draw a direct line for simplicity in this version, or 3 segments

    // Segment 1: x1 to x1+10
    // Segment 2: x1+10 to x2-10 (vertical travel)
    // Segment 3: x2-10 to x2

    // Actually, let's just draw a direct line for now to keep DOM light, or use SVG?
    // Using div lines is easier without SVG overlay

    // Horizontal line from source
    const line1 = document.createElement("div");
    line1.className = "dependency-line";

    // If x2 > x1, we can do a nice path.
    // Let's just do a simple direct connection logic for now:
    // 1. Exit right 10px
    // 2. Go down/up to target Y
    // 3. Go right to target X

    const midX = x1 + (x2 - x1) / 2;

    // Horizontal 1
    const l1 = document.createElement("div");
    l1.className = "dependency-line";
    l1.style.left = x1 + "px";
    l1.style.top = y1 + "px";
    l1.style.width = (midX - x1) + "px";
    l1.style.height = "1px";
    DOM.timelineGrid.appendChild(l1);

    // Vertical
    const l2 = document.createElement("div");
    l2.className = "dependency-line";
    l2.style.left = midX + "px";
    l2.style.top = Math.min(y1, y2) + "px";
    l2.style.width = "1px";
    l2.style.height = Math.abs(y2 - y1) + "px";
    DOM.timelineGrid.appendChild(l2);

    // Horizontal 2
    const l3 = document.createElement("div");
    l3.className = "dependency-line";
    l3.style.left = midX + "px";
    l3.style.top = y2 + "px";
    l3.style.width = (x2 - midX) + "px";
    l3.style.height = "1px";
    DOM.timelineGrid.appendChild(l3);

    // Arrow
    const arrow = document.createElement("div");
    arrow.className = "dependency-arrow";
    arrow.style.left = (x2 - 6) + "px";
    arrow.style.top = (y2 - 4) + "px";
    DOM.timelineGrid.appendChild(arrow);
}

// --- Interactions ---

function highlightTask(id, active) {
  const row = DOM.taskList.querySelector(`.task-item[data-id="${id}"]`);
  const bar = DOM.timelineGrid.querySelector(
    `.gantt-bar[data-id="${id}"]`
  );
  if (row)
    active
      ? row.classList.add("selected")
      : row.classList.remove("selected");
  if (bar) {
    bar.style.filter = active ? "brightness(1.1)" : "none";
    bar.style.zIndex = active ? "50" : "5";
  }
}

function showTooltip(e, t) {
  const resList =
    t.resources.map((r) => `${r.name} (${r.load}%)`).join(", ") || "-";
  DOM.tooltip.innerHTML = `
    <div style="font-weight:700; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">${
      t.name
    }</div>
    <div class="tooltip-row"><span class="tooltip-label">Phase</span> <span class="tooltip-val">${t.phase}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Début</span> <span class="tooltip-val">${t.start.toLocaleDateString()}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Fin</span> <span class="tooltip-val">${t.end.toLocaleDateString()}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Durée</span> <span class="tooltip-val">${
      t.duration
    } jours</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Avancement</span> <span class="tooltip-val">${
      t.complete
    }%</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Responsable</span> <span class="tooltip-val">${t.responsibleRole}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Ressources</span> <span class="tooltip-val">${resList}</span></div>
  `;
  DOM.tooltip.style.opacity = "1";
  moveTooltip(e);
}

function moveTooltip(e) {
  const x = e.clientX + 15;
  const y = e.clientY + 15;
  DOM.tooltip.style.left = x + "px";
  DOM.tooltip.style.top = y + "px";
}
function hideTooltip() {
  DOM.tooltip.style.opacity = "0";
}

window.addEventListener("mousemove", (e) => {
  if (DOM.tooltip.style.opacity === "1") moveTooltip(e);
});

DOM.timelineBody.addEventListener("scroll", () => {
  DOM.timelineHeader.scrollLeft = DOM.timelineBody.scrollLeft;
  DOM.taskList.scrollTop = DOM.timelineBody.scrollTop;
});
DOM.taskList.addEventListener("scroll", () => {
  DOM.timelineBody.scrollTop = DOM.taskList.scrollTop;
});

// Zoom & Fit
function fitView() {
  if (state.totalDays <= 0) return;
  const availWidth = DOM.timelinePanel.clientWidth;
  state.zoomLevel = 1;
  state.pxPerUnit = availWidth / state.totalDays;
  if (state.pxPerUnit < 20) {
    state.scale = "month";
    state.pxPerUnit = availWidth / (state.totalDays / 30);
  } else if (state.pxPerUnit < 50) {
    state.scale = "week";
    state.pxPerUnit = availWidth / (state.totalDays / 7);
  } else {
    state.scale = "day";
  }
  state.pxPerUnit = Math.max(10, Math.min(100, state.pxPerUnit));
  updateScaleBtns();
  renderTimeline();
}

function updateScaleBtns() {
  DOM.scaleBtns.forEach((b) => {
    if (b.dataset.scale === state.scale) b.classList.add("active");
    else b.classList.remove("active");
  });
}

// --- Modal Logic ---
function openEditModal(task) {
  DOM.editId.value = task.id;
  DOM.editName.value = task.name;
  DOM.editStart.value = fmtDateInput(task.start);
  DOM.editDuration.value = task.duration;
  DOM.editProgress.value = task.complete;
  DOM.editCost.value = task.cost || 0;

  // Resources
  DOM.editResList.innerHTML = "";
  // Combine existing task resources with all available resources to allow adding
  // For simplicity, we just list all resources and show their load if assigned, 0 if not
  state.resources.forEach((r) => {
    const assigned = task.resources.find((tr) => tr.id === r.id);
    const load = assigned ? assigned.load : 0;

    const row = document.createElement("div");
    row.className = "resource-row";
    row.innerHTML = `
      <div class="resource-name">${r.name} (${r.roleName})</div>
      <div class="resource-load">
        <input type="number" min="0" max="100" value="${load}" data-resid="${r.id}"> %
      </div>
    `;
    DOM.editResList.appendChild(row);
  });

  DOM.modal.classList.remove(HIDDEN_CLASS);
}

function closeModal() {
  DOM.modal.classList.add(HIDDEN_CLASS);
}

function saveTask() {
  const id = DOM.editId.value;
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  task.name = DOM.editName.value;
  task.start = startOfDay(new Date(DOM.editStart.value));
  task.duration = parseInt(DOM.editDuration.value, 10);
  task.end = addDays(task.start, task.duration);
  task.complete = parseInt(DOM.editProgress.value, 10);
  task.cost = parseFloat(DOM.editCost.value) || 0;

  // Update Resources
  const newResources = [];
  const inputs = DOM.editResList.querySelectorAll("input");
  inputs.forEach((inp) => {
    const load = parseFloat(inp.value);
    if (load > 0) {
      const rId = inp.dataset.resid;
      const r = state.resources.find((r) => r.id === rId);
      newResources.push({ id: rId, name: r.name, roleName: r.roleName, load: load });
    }
  });
  task.resources = newResources;

  // Re-calc bounds if dates changed
  // For simplicity, we just re-render. In a real app, we'd check bounds.
  renderApp();
  closeModal();
}

function downloadCSV() {
    const rows = [
        ["#", "ID", "PHASE", "TACHE", "RESPONSABLE", "DEBUT", "FIN", "DUREE (J)", "LIVRABLE", "DEPENDANCE"]
    ];

    // We can use state.tasks if loaded, or parse the table if not.
    // Let's use the table content since it's the source of truth for the static view
    const table = document.querySelector(".google-sheet-style");
    const trs = table.querySelectorAll("tbody tr");
    trs.forEach(tr => {
        const tds = tr.querySelectorAll("td");
        const row = [];
        tds.forEach(td => row.push(td.innerText));
        rows.push(row);
    });

    let csvContent = "data:text/csv;charset=utf-8,";
    rows.forEach(function(rowArray) {
        let row = rowArray.join(";");
        csvContent += row + "\r\n";
    });

    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "planning_smartcool.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Event Listeners ---
DOM.fileInput.addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const text = await f.text();
    loadGanFile(text);
  } catch (err) {
    console.error("File read error:", err);
    alert("Erreur lors de la lecture du fichier");
  }
});

DOM.btnExample.addEventListener("click", async () => {
  try {
    const res = await fetch("/gantt/test.gan");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    loadGanFile(text);
  } catch (err) {
    console.error("Gantt file fetch error:", err);
    alert("Erreur lors du chargement du planning. Vérifiez que le fichier /gantt/test.gan est accessible.");
  }
});
DOM.linkExample.addEventListener("click", (e) => {
  e.preventDefault();
  DOM.btnExample.click();
});

// Auto-load default gantt file on page load
window.addEventListener("load", () => {
  DOM.btnExample.click();
});

DOM.scaleBtns.forEach((b) => {
  b.addEventListener("click", () => {
    state.scale = b.dataset.scale;
    state.pxPerUnit = 40; // reset base
    updateScaleBtns();
    renderTimeline();
  });
});

DOM.btnZoomIn.addEventListener("click", () => {
  state.pxPerUnit = Math.min(200, state.pxPerUnit * 1.2);
  renderTimeline();
});
DOM.btnZoomOut.addEventListener("click", () => {
  state.pxPerUnit = Math.max(10, state.pxPerUnit * 0.8);
  renderTimeline();
});
DOM.btnFit.addEventListener("click", fitView);

DOM.search.addEventListener("input", () => {
  renderTaskList();
  renderTimeline();
});

DOM.btnToggleWeekend.addEventListener("click", () => {
  state.showWeekends = !state.showWeekends;
  DOM.btnToggleWeekend.classList.toggle("active", state.showWeekends);
  renderTimeline();
});

// Resizer Logic
let isResizing = false;
const resizer = document.getElementById("resizer");
resizer.addEventListener("mousedown", () => {
  isResizing = true;
  document.body.style.cursor = "col-resize";
});
window.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.cursor = "default";
});
window.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  const w = e.clientX - 260; // Sidebar width offset
  if (w > 200 && w < 800) {
    document.documentElement.style.setProperty(
      "--task-col-width",
      w + "px"
    );
  }
});
