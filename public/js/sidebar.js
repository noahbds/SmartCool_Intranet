const sidebarContent = `
<nav class="sidebar">
  <div class="brand">Smart<span>Cool</span></div>
  <div class="nav-links">
    <a href="index.html"><i class="fas fa-chart-line"></i> <span>Overview</span></a>
    <a href="dashboard.html"><i class="fas fa-bullseye"></i> <span>Dashboard</span></a>
    <a href="planning.html"><i class="fas fa-calendar-alt"></i> <span>Planning & Gantt</span></a>
    <a href="team.html"><i class="fas fa-users"></i> <span>Team & Skills</span></a>
    <a href="budget.html"><i class="fas fa-coins"></i> <span>Budget & Resources</span></a>
    <a href="risks.html"><i class="fas fa-exclamation-triangle"></i> <span>Risk Management</span></a>
    <a href="comm.html"><i class="fas fa-comments"></i> <span>Communications</span></a>
    <a href="defense.html"><i class="fas fa-flag-checkered"></i> <span>Delivery & Defense</span></a>
  </div>
  <div class="footer">v1.9</div>
</nav>
<button class="mobile-toggle" aria-label="Toggle Navigation">
  <i class="fas fa-bars"></i>
</button>
`;

document.addEventListener('DOMContentLoaded', () => {
  // Remove existing sidebar if any (to avoid duplicates if hardcoded exists)
  const existingSidebar = document.querySelector('.sidebar');
  if (existingSidebar) {
    existingSidebar.remove();
  }
  const existingToggle = document.querySelector('.mobile-toggle');
  if (existingToggle) {
    existingToggle.remove();
  }

  // Insert new sidebar at the start of body
  document.body.insertAdjacentHTML('afterbegin', sidebarContent);

  // Highlight active link
  const normalizePath = (path) => {
    // Handle full URLs or relative paths by taking the last segment
    // Also strip query params or hashes if present
    let p = path.split('/').pop().split('?')[0].split('#')[0]; 
    if (p.endsWith('.html')) {
      p = p.slice(0, -5);
    }
    // Treat empty path (root) or 'index' as the same
    if (p === '' || p === 'index') return 'index';
    return p;
  };

  const currentPath = normalizePath(window.location.pathname);
  const links = document.querySelectorAll('.nav-links a');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (normalizePath(href) === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Mobile Toggle Logic
  const toggleBtn = document.querySelector('.mobile-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      const icon = toggleBtn.querySelector('i');
      if (sidebar.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 900 && 
          sidebar.classList.contains('active') && 
          !sidebar.contains(e.target) && 
          !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('active');
        const icon = toggleBtn.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });
  }
});
