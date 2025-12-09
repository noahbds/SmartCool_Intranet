const sidebarContent = `
<nav class="sidebar">
  <div class="brand">Smart<span>Cool</span></div>
  <div class="nav-links">
    <a href="index.html"><i class="fas fa-chart-line"></i> <span>Dashboard</span></a>
    <a href="planning.html"><i class="fas fa-calendar-alt"></i> <span>Planning & Gantt</span></a>
    <a href="team.html"><i class="fas fa-users"></i> <span>Team & Skills</span></a>
    <a href="budget.html"><i class="fas fa-coins"></i> <span>Budget & Resources</span></a>
    <a href="risks.html"><i class="fas fa-exclamation-triangle"></i> <span>Risk Management</span></a>
    <a href="comm.html"><i class="fas fa-comments"></i> <span>Communications</span></a>
    <a href="defense.html"><i class="fas fa-flag-checkered"></i> <span>Delivery & Defense</span></a>
  </div>
  <div class="footer">v1.2</div>
</nav>
`;

document.addEventListener('DOMContentLoaded', () => {
  // Remove existing sidebar if any (to avoid duplicates if hardcoded exists)
  const existingSidebar = document.querySelector('.sidebar');
  if (existingSidebar) {
    existingSidebar.remove();
  }

  // Insert new sidebar at the start of body
  document.body.insertAdjacentHTML('afterbegin', sidebarContent);

  // Highlight active link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-links a');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    // Handle exact match or root
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});
