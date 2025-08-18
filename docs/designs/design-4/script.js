// Professional interactions and functionality for Momentum Platform

// Global state management
const AppState = {
  currentView: 'organization',
  connectedSources: new Set(['github']),
  teams: [
    {
      id: 'frontend',
      name: 'Frontend Team',
      repositories: ['web-app', 'mobile-app', 'ui-components'],
      contributors: 12,
      commits: 347
    },
    {
      id: 'backend',
      name: 'Backend Team',
      repositories: ['api-service', 'auth-service', 'data-pipeline'],
      contributors: 18,
      commits: 523
    },
    {
      id: 'devops',
      name: 'DevOps Team',
      repositories: ['infrastructure', 'ci-cd-templates', 'monitoring'],
      contributors: 8,
      commits: 142
    }
  ],
  unassignedRepos: 18,
  setupProgress: {
    account: true,
    dataSources: false,
    teams: false,
    review: false
  }
};

// Utility functions
const Utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  },

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  },

  animateValue(element, start, end, duration) {
    const startTimestamp = performance.now();
    const step = (timestamp) => {
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const value = Math.floor(progress * (end - start) + start);
      element.textContent = value;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }
};

// Dashboard functionality
const Dashboard = {
  init() {
    this.generateHeatmap();
    this.setupEventListeners();
    this.updateMetrics();
  },

  setupEventListeners() {
    // Date range selector
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
      dateRange.addEventListener('change', this.handleDateRangeChange.bind(this));
    }

    // Organization selector
    const orgSelect = document.getElementById('organizationSelect');
    if (orgSelect) {
      orgSelect.addEventListener('change', this.handleOrganizationChange.bind(this));
    }

    // Team selector
    const teamSelect = document.getElementById('teamSelect');
    if (teamSelect) {
      teamSelect.addEventListener('change', this.handleTeamChange.bind(this));
    }

    // Search functionality
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
      input.addEventListener('input', Utils.debounce(this.handleSearch.bind(this), 300));
    });
  },

  generateHeatmap() {
    const heatmapGrid = document.querySelector('.heatmap-grid');
    if (!heatmapGrid) return;

    // Clear existing cells
    heatmapGrid.innerHTML = '';

    // Generate 53 weeks * 7 days = 371 cells
    for (let week = 0; week < 53; week++) {
      for (let day = 0; day < 7; day++) {
        const cell = document.createElement('div');
        cell.className = `heatmap-cell level-${Math.floor(Math.random() * 5)}`;
        
        // Add tooltip
        const date = new Date();
        date.setDate(date.getDate() - (52 - week) * 7 - (6 - day));
        cell.title = `${date.toDateString()}: ${Math.floor(Math.random() * 20)} commits`;
        
        heatmapGrid.appendChild(cell);
      }
    }
  },

  updateMetrics() {
    // Animate metric values
    const metricValues = document.querySelectorAll('.metric-value');
    metricValues.forEach(element => {
      const endValue = parseInt(element.textContent.replace(/[^\d]/g, ''));
      if (endValue) {
        Utils.animateValue(element, 0, endValue, 1500);
      }
    });
  },

  handleDateRangeChange(event) {
    const range = event.target.value;
    console.log('Date range changed to:', range);
    
    if (range === 'custom') {
      this.showCustomDatePicker();
    } else {
      this.refreshData(range);
    }
  },

  handleOrganizationChange(event) {
    const orgId = event.target.value;
    console.log('Organization changed to:', orgId);
    this.refreshData();
  },

  handleTeamChange(event) {
    const teamId = event.target.value;
    if (teamId) {
      this.showIndividualTeamView(teamId);
    } else {
      this.showAllTeamsView();
    }
  },

  handleSearch(event) {
    const query = event.target.value.toLowerCase();
    const contributorRows = document.querySelectorAll('.contributors-table tbody tr');
    
    contributorRows.forEach(row => {
      const name = row.querySelector('.contributor-name').textContent.toLowerCase();
      const team = row.querySelector('.contributor-team').textContent.toLowerCase();
      
      if (name.includes(query) || team.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  },

  showCustomDatePicker() {
    // Implementation for custom date picker modal
    console.log('Show custom date picker');
  },

  refreshData(dateRange = null) {
    // Show loading state
    this.showLoadingState();
    
    // Simulate API call
    setTimeout(() => {
      this.hideLoadingState();
      this.updateMetrics();
      this.generateHeatmap();
    }, 1000);
  },

  showLoadingState() {
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
      card.classList.add('loading');
    });
  },

  hideLoadingState() {
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
      card.classList.remove('loading');
    });
  },

  showIndividualTeamView(teamId) {
    console.log('Show individual team view for:', teamId);
    // Implementation for individual team detailed view
  },

  showAllTeamsView() {
    console.log('Show all teams comparison view');
    // Implementation for teams comparison view
  }
};

// Navigation functions
function showTeamsView() {
  AppState.currentView = 'teams';
  switchDashboardView('teamsView');
  updateSidebarActive('teams');
}

function showContributorsView() {
  AppState.currentView = 'contributors';
  switchDashboardView('contributorsView');
  updateSidebarActive('contributors');
}

function showAllTeams() {
  const teamSelect = document.getElementById('teamSelect');
  if (teamSelect) {
    teamSelect.value = '';
  }
  // Show all teams comparison
  console.log('Show all teams comparison');
}

function showAllContributors() {
  console.log('Show all contributors');
  // Reset any filters or individual views
}

function switchDashboardView(viewId) {
  // Hide all views
  const views = document.querySelectorAll('.dashboard-view');
  views.forEach(view => view.classList.remove('active'));
  
  // Show selected view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
  }
}

function updateSidebarActive(section) {
  // Remove active class from all sidebar items
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => item.classList.remove('active'));
  
  // Add active class to selected section
  const targetItem = document.querySelector(`.sidebar-item[data-section="${section}"]`);
  if (targetItem) {
    targetItem.classList.add('active');
  }
}

// Authentication functions
const Auth = {
  init() {
    this.setupPasswordValidation();
    this.setupFormValidation();
  },

  setupPasswordValidation() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;

    passwordInput.addEventListener('input', (e) => {
      this.validatePassword(e.target.value);
    });
  },

  validatePassword(password) {
    const requirements = {
      'req-length': password.length >= 8,
      'req-uppercase': /[A-Z]/.test(password),
      'req-number': /\d/.test(password),
      'req-special': /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    Object.entries(requirements).forEach(([id, valid]) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.toggle('valid', valid);
      }
    });

    return Object.values(requirements).every(valid => valid);
  },

  setupFormValidation() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSignup(new FormData(signupForm));
    });
  },

  handleSignup(formData) {
    const submitButton = document.getElementById('submitButton');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Creating Account...';
    submitButton.disabled = true;

    // Simulate API call
    setTimeout(() => {
      console.log('Account created with data:', Object.fromEntries(formData));
      // Redirect to data sources page
      window.location.href = 'data-sources.html';
    }, 2000);
  }
};

function signUpWithProvider(provider) {
  console.log('Sign up with:', provider);
  
  // Show loading state
  const button = event.target.closest('.sso-button');
  const originalText = button.innerHTML;
  button.innerHTML = '<span class="sso-icon">⏳</span><span class="sso-text">Connecting...</span>';
  button.disabled = true;

  // Simulate OAuth flow
  setTimeout(() => {
    window.location.href = 'data-sources.html';
  }, 1500);
}

// Data Sources functionality
const DataSources = {
  init() {
    this.updateConnectionStatus();
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Monitor required connections
    this.checkRequiredConnections();
  },

  updateConnectionStatus() {
    const requiredStatus = document.getElementById('requiredStatus');
    const optionalStatus = document.getElementById('optionalStatus');
    const continueButton = document.getElementById('continueButton');

    if (requiredStatus && AppState.connectedSources.size > 0) {
      requiredStatus.innerHTML = `
        <span class="status-icon">✅</span>
        ${AppState.connectedSources.size} Version Control System(s) connected
      `;
      requiredStatus.classList.remove('incomplete');
      requiredStatus.classList.add('complete');
    }

    if (optionalStatus) {
      const optionalCount = Array.from(AppState.connectedSources).filter(s => s !== 'github').length;
      optionalStatus.innerHTML = `
        <span class="status-icon">ℹ️</span>
        ${optionalCount} optional integration(s) connected
      `;
    }

    if (continueButton) {
      continueButton.disabled = AppState.connectedSources.size === 0;
    }
  },

  checkRequiredConnections() {
    const hasRequiredConnection = AppState.connectedSources.size > 0;
    AppState.setupProgress.dataSources = hasRequiredConnection;
    return hasRequiredConnection;
  }
};

function connectSource(sourceId) {
  console.log('Connecting to:', sourceId);
  
  const sourceCard = document.querySelector(`[data-source="${sourceId}"]`);
  const connectButton = sourceCard.querySelector('.btn-connect');
  
  // Show loading state
  connectButton.textContent = 'Connecting...';
  connectButton.disabled = true;
  
  // Show connection modal
  showConnectionModal(sourceId);
}

function showConnectionModal(sourceId) {
  const modal = document.getElementById('connectionModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  
  if (!modal) return;

  const sourceNames = {
    github: 'GitHub',
    gitlab: 'GitLab',
    bitbucket: 'Bitbucket',
    jenkins: 'Jenkins',
    circleci: 'CircleCI',
    jira: 'Jira',
    linear: 'Linear',
    asana: 'Asana',
    sonarqube: 'SonarQube',
    codeql: 'CodeQL'
  };

  modalTitle.textContent = `Connect to ${sourceNames[sourceId]}`;
  modalContent.innerHTML = this.getConnectionModalContent(sourceId);
  modal.style.display = 'flex';
  
  // Simulate connection process
  setTimeout(() => {
    this.completeConnection(sourceId);
    this.closeConnectionModal();
  }, 3000);
}

function getConnectionModalContent(sourceId) {
  return `
    <div class="connection-flow">
      <div class="connection-step">
        <div class="step-icon">🔗</div>
        <h4>Authenticating...</h4>
        <p>Please wait while we establish a secure connection to ${sourceId}.</p>
      </div>
      <div class="connection-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 60%; animation: progress-fill 3s ease-in-out;"></div>
        </div>
      </div>
    </div>
  `;
}

function completeConnection(sourceId) {
  AppState.connectedSources.add(sourceId);
  
  const sourceCard = document.querySelector(`[data-source="${sourceId}"]`);
  const connectButton = sourceCard.querySelector('.btn-connect');
  const sourceStatus = sourceCard.querySelector('.source-status');
  
  // Update UI
  sourceCard.classList.add('connected');
  connectButton.style.display = 'none';
  sourceStatus.innerHTML = `
    <span class="status-badge connected">Connected</span>
  `;
  
  // Update connection summary
  DataSources.updateConnectionStatus();
}

function closeConnectionModal() {
  const modal = document.getElementById('connectionModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Team Setup functionality
const TeamSetup = {
  init() {
    this.setupTabs();
    this.loadDiscoveryResults();
  },

  setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
        this.showTab(tabId);
      });
    });
  },

  loadDiscoveryResults() {
    // Simulate loading repository discovery results
    this.updateRepositoryStats();
  },

  updateRepositoryStats() {
    // Update stats in the UI based on AppState
    const totalRepos = AppState.teams.reduce((sum, team) => sum + team.repositories.length, 0) + AppState.unassignedRepos;
    console.log('Total repositories discovered:', totalRepos);
  }
};

function showTab(tabId) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => content.classList.remove('active'));
  
  // Hide all tab buttons active state
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => button.classList.remove('active'));
  
  // Show selected tab
  const targetTab = document.getElementById(tabId);
  const targetButton = document.querySelector(`[onclick="showTab('${tabId}')"]`);
  
  if (targetTab) targetTab.classList.add('active');
  if (targetButton) targetButton.classList.add('active');
}

function runAutoDetection() {
  const suggestedTeams = document.getElementById('suggestedTeams');
  const analyzeButton = event.target;
  
  // Show loading state
  analyzeButton.textContent = '🔍 Analyzing...';
  analyzeButton.disabled = true;
  
  // Simulate analysis
  setTimeout(() => {
    suggestedTeams.style.display = 'block';
    analyzeButton.textContent = '🔍 Analyze & Suggest Teams';
    analyzeButton.disabled = false;
    
    // Scroll to results
    suggestedTeams.scrollIntoView({ behavior: 'smooth' });
  }, 2000);
}

function acceptTeam(teamId) {
  console.log('Accept team suggestion:', teamId);
  
  const teamCard = event.target.closest('.suggested-team');
  teamCard.style.opacity = '0.5';
  
  setTimeout(() => {
    teamCard.remove();
    this.updateTeamSummary();
  }, 300);
}

function editTeam(teamId) {
  console.log('Edit team:', teamId);
  // Implementation for team editing modal
}

function createTeam() {
  const teamName = document.getElementById('teamName').value;
  const teamDescription = document.getElementById('teamDescription').value;
  
  if (!teamName.trim()) {
    alert('Please enter a team name');
    return;
  }
  
  const newTeam = {
    id: Utils.generateId(),
    name: teamName,
    description: teamDescription,
    repositories: [],
    contributors: 0
  };
  
  AppState.teams.push(newTeam);
  
  // Clear form
  document.getElementById('teamName').value = '';
  document.getElementById('teamDescription').value = '';
  
  // Update UI
  this.renderCreatedTeams();
  this.updateTeamSummary();
}

function addAssignmentRule() {
  const pattern = document.getElementById('rulePattern').value;
  const team = document.getElementById('ruleTeam').value;
  
  if (!pattern.trim() || !team) {
    alert('Please fill in both pattern and team selection');
    return;
  }
  
  console.log('Add assignment rule:', { pattern, team });
  
  // Clear form
  document.getElementById('rulePattern').value = '';
  document.getElementById('ruleTeam').value = '';
}

function removeRule(ruleIndex) {
  console.log('Remove rule at index:', ruleIndex);
  event.target.closest('.rule-item').remove();
}

function applyBulkRules() {
  console.log('Apply bulk assignment rules');
  // Implementation for applying bulk rules
}

function assignRepo(repoName, teamId) {
  if (teamId === 'new') {
    const newTeamName = prompt('Enter new team name:');
    if (newTeamName) {
      createTeam();
      // Assign repo to new team
    }
    return;
  }
  
  console.log('Assign repository', repoName, 'to team', teamId);
  
  // Update AppState
  const team = AppState.teams.find(t => t.id === teamId);
  if (team) {
    team.repositories.push(repoName);
    AppState.unassignedRepos--;
    
    // Update UI
    event.target.closest('.repo-card').remove();
    this.updateTeamSummary();
  }
}

function resetTeams() {
  if (confirm('This will reset all team configurations. Are you sure?')) {
    AppState.teams = [];
    AppState.unassignedRepos = 47; // Reset to total discovered
    this.updateTeamSummary();
    console.log('Teams reset');
  }
}

function editTeamDetails(teamId) {
  console.log('Edit team details:', teamId);
  // Implementation for team details editing
}

function deleteTeam(teamId) {
  if (confirm('Are you sure you want to delete this team?')) {
    const teamIndex = AppState.teams.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      const team = AppState.teams[teamIndex];
      AppState.unassignedRepos += team.repositories.length;
      AppState.teams.splice(teamIndex, 1);
      this.updateTeamSummary();
      console.log('Team deleted:', teamId);
    }
  }
}

function showAllUnassigned() {
  console.log('Show all unassigned repositories');
  // Implementation for showing all unassigned repos
}

// Review functionality
const Review = {
  init() {
    this.validateConfiguration();
    this.setupCompletionFlow();
  },

  validateConfiguration() {
    const warnings = [];
    
    if (AppState.unassignedRepos > 0) {
      warnings.push(`${AppState.unassignedRepos} repositories remain unassigned`);
    }
    
    if (AppState.connectedSources.size === 0) {
      warnings.push('No data sources connected');
    }
    
    this.displayWarnings(warnings);
  },

  displayWarnings(warnings) {
    const warningContainer = document.getElementById('unassignedWarning');
    if (warningContainer && warnings.length === 0) {
      warningContainer.style.display = 'none';
    }
  },

  setupCompletionFlow() {
    const completeButton = document.getElementById('completeSetupBtn');
    if (completeButton) {
      completeButton.addEventListener('click', this.handleCompletion.bind(this));
    }
  },

  handleCompletion() {
    this.showCompletionModal();
    this.simulateSetupCompletion();
  },

  showCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  },

  simulateSetupCompletion() {
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const goToDashboard = document.getElementById('goToDashboard');
    
    const steps = [
      { progress: 20, text: 'Connecting to data sources...' },
      { progress: 40, text: 'Collecting initial data...' },
      { progress: 60, text: 'Setting up teams...' },
      { progress: 80, text: 'Generating dashboards...' },
      { progress: 100, text: 'Setup complete!' }
    ];
    
    let currentStep = 0;
    
    const updateProgress = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        progressFill.style.width = step.progress + '%';
        progressStatus.textContent = step.text;
        currentStep++;
        
        setTimeout(updateProgress, 1500);
      } else {
        goToDashboard.style.display = 'block';
      }
    };
    
    updateProgress();
  }
};

function editSection(sectionName) {
  console.log('Edit section:', sectionName);
  
  const pages = {
    'organization': 'signup.html',
    'data-sources': 'data-sources.html',
    'teams': 'team-setup.html'
  };
  
  if (pages[sectionName]) {
    window.location.href = pages[sectionName];
  }
}

function showUnassignedRepos() {
  console.log('Show unassigned repositories');
  // Implementation for showing unassigned repos modal or section
}

function completeSetup() {
  Review.handleCompletion();
}

function goToDashboard() {
  window.location.href = 'index.html';
}

// Navigation functions
function goToPreviousStep() {
  const currentPage = window.location.pathname.split('/').pop();
  const navigation = {
    'data-sources.html': 'signup.html',
    'team-setup.html': 'data-sources.html',
    'review.html': 'team-setup.html'
  };
  
  if (navigation[currentPage]) {
    window.location.href = navigation[currentPage];
  }
}

function goToNextStep() {
  const currentPage = window.location.pathname.split('/').pop();
  const navigation = {
    'data-sources.html': 'team-setup.html',
    'team-setup.html': 'review.html',
    'review.html': 'index.html'
  };
  
  if (navigation[currentPage]) {
    window.location.href = navigation[currentPage];
  }
}

// Tip functionality
const Tips = {
  init() {
    this.setupTipRotation();
  },

  setupTipRotation() {
    const tipItems = document.querySelectorAll('.tip-item');
    if (tipItems.length > 0) {
      let currentTip = 0;
      
      setInterval(() => {
        tipItems[currentTip].style.opacity = '0.5';
        currentTip = (currentTip + 1) % tipItems.length;
        
        setTimeout(() => {
          tipItems.forEach(item => item.style.opacity = '1');
          tipItems[currentTip].style.transform = 'scale(1.02)';
          
          setTimeout(() => {
            tipItems[currentTip].style.transform = 'scale(1)';
          }, 200);
        }, 100);
      }, 5000);
    }
  }
};

// Initialize appropriate functionality based on current page
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop();
  
  switch (currentPage) {
    case 'index.html':
    case '':
      Dashboard.init();
      break;
    case 'signup.html':
      Auth.init();
      break;
    case 'data-sources.html':
      DataSources.init();
      Tips.init();
      break;
    case 'team-setup.html':
      TeamSetup.init();
      Tips.init();
      break;
    case 'review.html':
      Review.init();
      break;
  }
  
  // Global event listeners
  setupGlobalEventListeners();
});

function setupGlobalEventListeners() {
  // Handle modal close on backdrop click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.style.display = 'none';
    }
  });
  
  // Handle form submissions
  document.addEventListener('submit', (e) => {
    if (e.target.tagName === 'FORM') {
      console.log('Form submitted:', e.target.id);
    }
  });
  
  // Handle button clicks for analytics
  document.addEventListener('click', (e) => {
    if (e.target.matches('button') || e.target.matches('.btn')) {
      console.log('Button clicked:', e.target.textContent.trim());
    }
  });
}

// Export functions for global access
window.Dashboard = Dashboard;
window.Auth = Auth;
window.DataSources = DataSources;
window.TeamSetup = TeamSetup;
window.Review = Review;
window.Utils = Utils;