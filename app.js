const STORAGE_KEY = "eventDashboardData";

function loadData() {
  const emptyData = {
    events: [],
    users: [],
    projects: [],
    feedback: [],
    suggestions: [],
    preferences: {}
  };

  try {
    return { ...emptyData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return emptyData;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showEmpty(message = "Nothing here yet.") {
  return `<div class="empty">${escapeHTML(message)}</div>`;
}

function makeRecord(title, detail = "", badge = "", actions = "") {
  return `
    <article class="record">
      <div>
        <h4>${escapeHTML(title)}</h4>
        ${detail ? `<p>${escapeHTML(detail)}</p>` : ""}
        ${badge ? `<span class="badge">${escapeHTML(badge)}</span>` : ""}
      </div>
      <div class="record-actions">${actions}</div>
    </article>`;
}

function deleteRecord(collection, id) {
  const data = loadData();
  data[collection] = data[collection].filter((item) => item.id !== id);
  saveData(data);
  renderAll();
}

function applyPreferences() {
  const preferences = loadData().preferences || {};
  document.body.classList.toggle("dark", Boolean(preferences.darkMode));
  document.body.classList.toggle("compact", Boolean(preferences.compactMode));

  const welcome = document.getElementById("welcome");
  welcome.textContent = preferences.displayName
    ? `Welcome, ${preferences.displayName}`
    : "Welcome back";

  document.getElementById("darkMode").checked = Boolean(preferences.darkMode);
  document.getElementById("compactMode").checked = Boolean(preferences.compactMode);
  document.getElementById("displayName").value = preferences.displayName || "";
}

function navigateTo(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageName}`);
  });

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
}

function renderDashboard() {
  const data = loadData();

  document.getElementById("eventCount").textContent = data.events.length;
  document.getElementById("userCount").textContent = data.users.length;
  document.getElementById("projectCount").textContent = data.projects.length;
  document.getElementById("suggestionCount").textContent = data.suggestions.length;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.events
    .filter((event) => event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  document.getElementById("upcomingEvents").innerHTML = upcoming.length
    ? upcoming.map((event) => {
      const timing = event.allDay ? "All day" : `${event.start || ""}–${event.end || ""}`;
      const details = [event.date, timing, event.location, event.description]
        .filter(Boolean).join(" · ");
      return makeRecord(event.title, details);
    }).join("")
    : showEmpty("No upcoming events. Add one from the Events page.");
}

function renderEvents() {
  const data = loadData();
  const query = document.getElementById("eventSearch").value.toLowerCase();
  const events = data.events
    .filter((event) => [event.title, event.description, event.location, event.date]
      .join(" ").toLowerCase().includes(query))
    .sort((a, b) => a.date.localeCompare(b.date));

  document.getElementById("eventList").innerHTML = events.length
    ? events.map((event) => {
      const time = event.allDay ? "All day" : `${event.start || ""}–${event.end || ""}`;
      const detail = [event.date, time, event.location, event.description]
        .filter(Boolean).join(" · ");
      return makeRecord(
        event.title,
        detail,
        "",
        `<button class="secondary" data-action="edit-event" data-id="${event.id}">Edit</button>
         <button class="danger" data-action="delete" data-collection="events" data-id="${event.id}">Delete</button>`
      );
    }).join("")
    : showEmpty("No events found.");
}

function clearEventForm() {
  document.getElementById("eventForm").reset();
  document.getElementById("eventId").value = "";
  document.getElementById("eventFormHeading").textContent = "Create event";
  document.getElementById("eventDate").min = new Date().toISOString().slice(0, 10);
  toggleEventTimeFields();
}

function toggleEventTimeFields() {
  document.getElementById("eventTimeFields").style.display =
    document.getElementById("eventAllDay").checked ? "none" : "flex";
}

function editEvent(id) {
  const event = loadData().events.find((item) => item.id === id);
  if (!event) return;

  const fields = {
    eventId: event.id,
    eventTitle: event.title,
    eventLocation: event.location,
    eventDescription: event.description,
    eventDate: event.date,
    eventStart: event.start,
    eventEnd: event.end
  };

  Object.entries(fields).forEach(([fieldId, value]) => {
    document.getElementById(fieldId).value = value || "";
  });

  document.getElementById("eventAllDay").checked = Boolean(event.allDay);
  document.getElementById("eventFormHeading").textContent = "Edit event";
  toggleEventTimeFields();
  document.getElementById("eventForm").scrollIntoView({ behavior: "smooth" });
}

function renderUsers() {
  const data = loadData();
  const query = document.getElementById("userSearch").value.toLowerCase();
  const users = data.users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(query));

  document.getElementById("userList").innerHTML = users.length
    ? users.map((user) => makeRecord(
      user.name,
      user.email,
      "",
      `<button class="danger" data-action="delete" data-collection="users" data-id="${user.id}">Delete</button>`
    )).join("")
    : showEmpty("No users found.");
}

function renderProjects() {
  const data = loadData();
  const query = document.getElementById("projectSearch").value.toLowerCase();
  const projects = data.projects.filter((project) =>
    `${project.name} ${project.description} ${project.status}`.toLowerCase().includes(query));

  document.getElementById("projectList").innerHTML = projects.length
    ? projects.map((project) => makeRecord(
      project.name,
      project.description,
      project.status,
      `<button class="secondary" data-action="cycle-project" data-id="${project.id}">Change status</button>
       <button class="danger" data-action="delete" data-collection="projects" data-id="${project.id}">Delete</button>`
    )).join("")
    : showEmpty("No projects found.");
}

function cycleProject(id) {
  const data = loadData();
  const project = data.projects.find((item) => item.id === id);
  const statuses = ["Planned", "In progress", "Completed"];

  if (project) {
    project.status = statuses[(statuses.indexOf(project.status) + 1) % statuses.length];
    saveData(data);
    renderProjects();
    renderDashboard();
  }
}

function renderFeedback() {
  const feedback = loadData().feedback.slice().reverse();

  document.getElementById("feedbackList").innerHTML = feedback.length
    ? feedback.map((item) => makeRecord(
      item.name || "Anonymous",
      item.message,
      new Date(item.created).toLocaleString(),
      `<button class="danger" data-action="delete" data-collection="feedback" data-id="${item.id}">Delete</button>`
    )).join("")
    : showEmpty("No feedback submitted yet.");
}

function renderSuggestions() {
  const suggestions = loadData().suggestions.slice().reverse();

  document.getElementById("suggestionList").innerHTML = suggestions.length
    ? suggestions.map((item) => makeRecord(
      item.text,
      "",
      item.status,
      `<button class="secondary" data-action="toggle-suggestion" data-id="${item.id}">Mark ${item.status === "New" ? "reviewed" : "new"}</button>
       <button class="danger" data-action="delete" data-collection="suggestions" data-id="${item.id}">Delete</button>`
    )).join("")
    : showEmpty("No suggestions submitted yet.");
}

function renderAll() {
  renderDashboard();
  renderEvents();
  renderUsers();
  renderProjects();
  renderFeedback();
  renderSuggestions();
}

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => navigateTo(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => navigateTo(button.dataset.go));
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id, collection } = button.dataset;

  if (action === "delete") {
    if (confirm("Delete this item?")) deleteRecord(collection, id);
  } else if (action === "edit-event") {
    editEvent(id);
  } else if (action === "cycle-project") {
    cycleProject(id);
  } else if (action === "toggle-suggestion") {
    const data = loadData();
    const suggestion = data.suggestions.find((item) => item.id === id);
    if (suggestion) {
      suggestion.status = suggestion.status === "New" ? "Reviewed" : "New";
      saveData(data);
      renderSuggestions();
      renderDashboard();
    }
  }
});

document.getElementById("eventForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const data = loadData();
  const id = document.getElementById("eventId").value;
  const item = {
    id: id || createId(),
    title: document.getElementById("eventTitle").value.trim(),
    location: document.getElementById("eventLocation").value.trim(),
    description: document.getElementById("eventDescription").value.trim(),
    date: document.getElementById("eventDate").value,
    allDay: document.getElementById("eventAllDay").checked,
    start: document.getElementById("eventStart").value,
    end: document.getElementById("eventEnd").value
  };

  if (!item.allDay && item.start && item.end && item.end <= item.start) {
    alert("End time must be later than start time.");
    return;
  }

  if (id) {
    data.events = data.events.map((oldItem) => oldItem.id === id ? item : oldItem);
  } else {
    data.events.push(item);
  }

  saveData(data);
  clearEventForm();
  renderAll();
});

document.getElementById("clearEventForm").addEventListener("click", clearEventForm);
document.getElementById("eventAllDay").addEventListener("change", toggleEventTimeFields);
document.getElementById("eventSearch").addEventListener("input", renderEvents);

document.getElementById("userForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  data.users.push({
    id: createId(),
    name: document.getElementById("userName").value.trim(),
    email: document.getElementById("userEmail").value.trim()
  });
  saveData(data);
  event.target.reset();
  renderAll();
});

document.getElementById("userSearch").addEventListener("input", renderUsers);

document.getElementById("projectForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  data.projects.push({
    id: createId(),
    name: document.getElementById("projectName").value.trim(),
    description: document.getElementById("projectDescription").value.trim(),
    status: document.getElementById("projectStatus").value
  });
  saveData(data);
  event.target.reset();
  renderAll();
});

document.getElementById("projectSearch").addEventListener("input", renderProjects);

document.getElementById("feedbackForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  data.feedback.push({
    id: createId(),
    name: document.getElementById("feedbackName").value.trim(),
    message: document.getElementById("feedbackMessage").value.trim(),
    created: Date.now()
  });
  saveData(data);
  event.target.reset();
  renderAll();
});

document.getElementById("suggestionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  data.suggestions.push({
    id: createId(),
    text: document.getElementById("suggestionText").value.trim(),
    status: "New"
  });
  saveData(data);
  event.target.reset();
  renderAll();
});

document.getElementById("preferencesForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = loadData();
  data.preferences = {
    displayName: document.getElementById("displayName").value.trim(),
    darkMode: document.getElementById("darkMode").checked,
    compactMode: document.getElementById("compactMode").checked
  };
  saveData(data);
  applyPreferences();
  alert("Preferences saved.");
});

document.getElementById("themeToggle").addEventListener("click", () => {
  const data = loadData();
  data.preferences = data.preferences || {};
  data.preferences.darkMode = !document.body.classList.contains("dark");
  saveData(data);
  applyPreferences();
});

document.getElementById("resetData").addEventListener("click", () => {
  if (confirm("Delete all saved events, users, projects, feedback, suggestions, and preferences?")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

document.getElementById("eventDate").min = new Date().toISOString().slice(0, 10);
applyPreferences();
toggleEventTimeFields();
renderAll();
