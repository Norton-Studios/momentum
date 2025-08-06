// Momentum Onboarding Flow JavaScript

class OnboardingWizard {
  constructor() {
    this.currentStep = this.getCurrentStepFromURL();
    this.totalSteps = 4;
    this.formData = this.loadFormData();
    this.init();
  }

  init() {
    this.updateProgressIndicator();
    this.bindEvents();
    this.loadStepData();
  }

  getCurrentStepFromURL() {
    const path = window.location.pathname;
    if (path.includes('signup.html')) return 1;
    if (path.includes('data-sources.html')) return 2;
    if (path.includes('team-setup.html')) return 3;
    if (path.includes('review.html')) return 4;
    return 1;
  }

  loadFormData() {
    const saved = localStorage.getItem('momentum-onboarding');
    return saved ? JSON.parse(saved) : {
      account: {},
      dataSources: [],
      repositories: [],
      teamMembers: []
    };
  }

  saveFormData() {
    localStorage.setItem('momentum-onboarding', JSON.stringify(this.formData));
  }

  updateProgressIndicator() {
    const steps = document.querySelectorAll('.progress-step');
    const lines = document.querySelectorAll('.progress-line');
    
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      const indicator = step.querySelector('.step-indicator');
      const label = step.querySelector('.step-label');
      
      // Remove all state classes
      indicator.classList.remove('active', 'completed');
      label.classList.remove('active', 'completed');
      
      if (stepNumber < this.currentStep) {
        indicator.classList.add('completed');
        label.classList.add('completed');
      } else if (stepNumber === this.currentStep) {
        indicator.classList.add('active');
        label.classList.add('active');
      }
    });

    // Update progress lines
    lines.forEach((line, index) => {
      line.classList.toggle('completed', index + 1 < this.currentStep);
    });
  }

  bindEvents() {
    // Form submission
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    });

    // Navigation buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-next')) {
        this.nextStep();
      } else if (e.target.classList.contains('btn-prev')) {
        this.prevStep();
      } else if (e.target.classList.contains('data-source-card')) {
        this.toggleDataSource(e.target);
      } else if (e.target.classList.contains('sso-btn')) {
        this.handleSSO(e.target);
      }
    });

    // Repository checkboxes
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('repository-checkbox')) {
        this.toggleRepository(e.target);
      }
    });

    // Real-time form validation
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.validateForm());
      input.addEventListener('blur', () => this.validateForm());
    });
  }

  handleFormSubmit(e) {
    e.preventDefault();
    if (this.validateForm()) {
      this.saveStepData();
      this.nextStep();
    }
  }

  saveStepData() {
    const form = document.querySelector('form');
    if (!form) return;

    const formData = new FormData(form);
    
    switch (this.currentStep) {
      case 1:
        this.formData.account = {
          email: formData.get('email'),
          password: formData.get('password'),
          organizationName: formData.get('organizationName'),
          ssoProvider: formData.get('ssoProvider') || null
        };
        break;
      
      case 2:
        // Data sources are handled by toggleDataSource method
        break;
      
      case 3:
        // Repositories and team data handled by other methods
        break;
    }
    
    this.saveFormData();
  }

  loadStepData() {
    switch (this.currentStep) {
      case 1:
        this.populateSignupForm();
        break;
      case 2:
        this.populateDataSources();
        break;
      case 3:
        this.loadRepositories();
        break;
      case 4:
        this.populateReview();
        break;
    }
  }

  populateSignupForm() {
    const { account } = this.formData;
    if (account.email) {
      const emailInput = document.querySelector('input[name="email"]');
      if (emailInput) emailInput.value = account.email;
    }
    if (account.organizationName) {
      const orgInput = document.querySelector('input[name="organizationName"]');
      if (orgInput) orgInput.value = account.organizationName;
    }
  }

  populateDataSources() {
    const selectedSources = this.formData.dataSources;
    const cards = document.querySelectorAll('.data-source-card');
    
    cards.forEach(card => {
      const sourceType = card.dataset.source;
      if (selectedSources.includes(sourceType)) {
        card.classList.add('selected');
      }
    });
  }

  async loadRepositories() {
    const container = document.querySelector('.repository-list');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading repositories...</div>';

    // Simulate API call
    setTimeout(() => {
      const repositories = this.generateMockRepositories();
      this.renderRepositories(repositories);
      this.populateSelectedRepositories();
    }, 1500);
  }

  generateMockRepositories() {
    const repos = [
      { name: 'momentum-dashboard', description: 'Main dashboard application', language: 'TypeScript', stars: 42, private: false },
      { name: 'momentum-api', description: 'REST API backend service', language: 'Node.js', stars: 18, private: true },
      { name: 'momentum-mobile', description: 'Mobile companion app', language: 'React Native', stars: 23, private: false },
      { name: 'momentum-docs', description: 'Documentation and guides', language: 'Markdown', stars: 7, private: false },
      { name: 'momentum-cli', description: 'Command line interface tools', language: 'Python', stars: 31, private: false },
      { name: 'momentum-plugins', description: 'Plugin development framework', language: 'JavaScript', stars: 15, private: true }
    ];

    return repos.map(repo => ({
      ...repo,
      id: repo.name,
      selected: this.formData.repositories.includes(repo.name)
    }));
  }

  renderRepositories(repositories) {
    const container = document.querySelector('.repository-list');
    if (!container) return;

    container.innerHTML = repositories.map(repo => `
      <div class="repository-item">
        <input type="checkbox" class="repository-checkbox" data-repo="${repo.id}" ${repo.selected ? 'checked' : ''}>
        <div class="repository-info">
          <div class="repository-name">${repo.name} ${repo.private ? '🔒' : ''}</div>
          <div class="repository-description">${repo.description}</div>
          <div class="repository-meta">
            <span>${repo.language}</span>
            <span>⭐ ${repo.stars}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  populateSelectedRepositories() {
    const checkboxes = document.querySelectorAll('.repository-checkbox');
    checkboxes.forEach(checkbox => {
      const repoName = checkbox.dataset.repo;
      checkbox.checked = this.formData.repositories.includes(repoName);
    });
  }

  populateReview() {
    const { account, dataSources, repositories } = this.formData;
    
    // Account info
    const accountSection = document.querySelector('[data-section="account"]');
    if (accountSection) {
      accountSection.innerHTML = `
        <div class="review-item">
          <span class="review-label">Email</span>
          <span class="review-value">${account.email || 'Not provided'}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Organization</span>
          <span class="review-value">${account.organizationName || 'Not provided'}</span>
        </div>
        ${account.ssoProvider ? `
        <div class="review-item">
          <span class="review-label">SSO Provider</span>
          <span class="review-value">${account.ssoProvider}</span>
        </div>
        ` : ''}
      `;
    }

    // Data sources
    const dataSourcesSection = document.querySelector('[data-section="dataSources"]');
    if (dataSourcesSection) {
      dataSourcesSection.innerHTML = `
        <div class="review-item">
          <span class="review-label">Selected Sources</span>
          <span class="review-value">${dataSources.length > 0 ? dataSources.join(', ') : 'None selected'}</span>
        </div>
      `;
    }

    // Repositories
    const repositoriesSection = document.querySelector('[data-section="repositories"]');
    if (repositoriesSection) {
      repositoriesSection.innerHTML = `
        <div class="review-item">
          <span class="review-label">Repositories</span>
          <span class="review-value">${repositories.length} selected</span>
        </div>
        ${repositories.length > 0 ? `
        <div class="review-item">
          <span class="review-label">Repository List</span>
          <span class="review-value">${repositories.slice(0, 3).join(', ')}${repositories.length > 3 ? ` +${repositories.length - 3} more` : ''}</span>
        </div>
        ` : ''}
      `;
    }
  }

  toggleDataSource(card) {
    const sourceType = card.dataset.source;
    card.classList.toggle('selected');
    
    if (card.classList.contains('selected')) {
      if (!this.formData.dataSources.includes(sourceType)) {
        this.formData.dataSources.push(sourceType);
      }
    } else {
      this.formData.dataSources = this.formData.dataSources.filter(s => s !== sourceType);
    }
    
    this.saveFormData();
    this.validateForm();
  }

  toggleRepository(checkbox) {
    const repoName = checkbox.dataset.repo;
    
    if (checkbox.checked) {
      if (!this.formData.repositories.includes(repoName)) {
        this.formData.repositories.push(repoName);
      }
    } else {
      this.formData.repositories = this.formData.repositories.filter(r => r !== repoName);
    }
    
    this.saveFormData();
    this.validateForm();
  }

  handleSSO(button) {
    button.preventDefault();
    const provider = button.dataset.provider;
    this.formData.account.ssoProvider = provider;
    this.saveFormData();
    
    // Simulate SSO flow
    button.innerHTML = '<div class="spinner"></div>Connecting...';
    setTimeout(() => {
      this.nextStep();
    }, 2000);
  }

  validateForm() {
    let isValid = true;
    const nextBtn = document.querySelector('.btn-next');
    
    switch (this.currentStep) {
      case 1:
        const email = document.querySelector('input[name="email"]')?.value;
        const password = document.querySelector('input[name="password"]')?.value;
        const orgName = document.querySelector('input[name="organizationName"]')?.value;
        
        isValid = email && password && orgName && email.includes('@');
        break;
      
      case 2:
        isValid = this.formData.dataSources.length > 0;
        break;
      
      case 3:
        isValid = this.formData.repositories.length > 0;
        break;
      
      case 4:
        isValid = true; // Review step is always valid
        break;
    }
    
    if (nextBtn) {
      nextBtn.disabled = !isValid;
    }
    
    return isValid;
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.navigateToStep(this.currentStep + 1);
    } else {
      this.completeOnboarding();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.navigateToStep(this.currentStep - 1);
    }
  }

  navigateToStep(step) {
    const pages = ['signup.html', 'data-sources.html', 'team-setup.html', 'review.html'];
    const targetPage = pages[step - 1];
    
    if (targetPage) {
      // Add smooth transition
      document.body.style.opacity = '0.7';
      setTimeout(() => {
        window.location.href = targetPage;
      }, 200);
    }
  }

  async completeOnboarding() {
    const completeBtn = document.querySelector('.btn-complete');
    if (completeBtn) {
      completeBtn.innerHTML = '<div class="spinner"></div>Setting up your workspace...';
      completeBtn.disabled = true;
    }

    // Simulate workspace setup
    await this.simulateWorkspaceSetup();
    
    // Show success animation
    this.showSuccessAnimation();
    
    // Clear onboarding data
    setTimeout(() => {
      localStorage.removeItem('momentum-onboarding');
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    }, 3000);
  }

  async simulateWorkspaceSetup() {
    const steps = [
      'Creating organization workspace...',
      'Connecting to data sources...',
      'Discovering repositories...',
      'Setting up team permissions...',
      'Initializing dashboard...'
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log(step);
    }
  }

  showSuccessAnimation() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="success-animation">
          <div class="success-icon">✓</div>
          <h2 class="step-title">Welcome to Momentum!</h2>
          <p class="step-subtitle">Your workspace has been set up successfully. Redirecting to your dashboard...</p>
        </div>
      `;
    }
  }
}

// Initialize the wizard when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new OnboardingWizard();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
  new OnboardingWizard();
});

// Utility functions for form enhancements
function togglePasswordVisibility(button) {
  const input = button.previousElementSibling;
  const icon = button.querySelector('i') || button;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '👁️‍🗨️';
  } else {
    input.type = 'password';
    icon.textContent = '👁️';
  }
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function strengthenPassword(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/)) strength++;
  if (password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  
  return {
    score: strength,
    label: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  };
}