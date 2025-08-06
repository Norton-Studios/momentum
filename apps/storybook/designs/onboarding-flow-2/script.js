// Momentum Onboarding Flow 2 - JavaScript

class OnboardingWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.formData = {
      account: {},
      dataSource: {},
      repositories: [],
      team: []
    };
    
    this.init();
  }

  init() {
    this.updateProgress();
    this.setupEventListeners();
    this.loadMockData();
  }

  setupEventListeners() {
    // Form validation
    document.querySelectorAll('.form-input').forEach(input => {
      input.addEventListener('blur', (e) => this.validateField(e.target));
      input.addEventListener('input', (e) => this.clearFieldError(e.target));
    });

    // Data source selection
    document.querySelectorAll('.data-source-card').forEach(card => {
      card.addEventListener('click', (e) => this.selectDataSource(e.currentTarget));
    });

    // Repository selection
    const selectAllBtn = document.getElementById('selectAll');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAllRepositories());
    }

    // Repository search
    const searchInput = document.getElementById('repoSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterRepositories(e.target.value));
    }

    // Navigation buttons
    const nextBtns = document.querySelectorAll('.btn-next');
    const prevBtns = document.querySelectorAll('.btn-prev');

    nextBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextStep();
      });
    });

    prevBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.previousStep();
      });
    });

    // Complete setup button
    const completeBtn = document.getElementById('completeSetup');
    if (completeBtn) {
      completeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.completeSetup();
      });
    }

    // SSO buttons
    document.querySelectorAll('.sso-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleSSOLogin(e.currentTarget.dataset.provider);
      });
    });
  }

  updateProgress() {
    const progressFill = document.querySelector('.progress-fill');
    const steps = document.querySelectorAll('.progress-step');
    
    if (progressFill) {
      const progressPercentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
      progressFill.style.width = `${progressPercentage}%`;
    }

    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      const indicator = step.querySelector('.step-indicator');
      const label = step.querySelector('.step-label');

      // Reset classes
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
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';

    // Clear previous errors
    this.clearFieldError(field);

    // Validation rules
    switch (fieldName) {
      case 'email':
        if (!value) {
          errorMessage = 'Email is required';
          isValid = false;
        } else if (!this.isValidEmail(value)) {
          errorMessage = 'Please enter a valid email address';
          isValid = false;
        }
        break;

      case 'password':
        if (!value) {
          errorMessage = 'Password is required';
          isValid = false;
        } else if (value.length < 8) {
          errorMessage = 'Password must be at least 8 characters long';
          isValid = false;
        } else if (!this.isStrongPassword(value)) {
          errorMessage = 'Password must contain uppercase, lowercase, number, and special character';
          isValid = false;
        }
        break;

      case 'confirmPassword':
        const password = document.querySelector('input[name="password"]');
        if (!value) {
          errorMessage = 'Please confirm your password';
          isValid = false;
        } else if (password && value !== password.value) {
          errorMessage = 'Passwords do not match';
          isValid = false;
        }
        break;

      case 'firstName':
      case 'lastName':
        if (!value) {
          errorMessage = `${fieldName === 'firstName' ? 'First' : 'Last'} name is required`;
          isValid = false;
        }
        break;

      case 'organizationName':
        if (!value) {
          errorMessage = 'Organization name is required';
          isValid = false;
        }
        break;

      case 'accessToken':
        if (!value) {
          errorMessage = 'Access token is required';
          isValid = false;
        }
        break;

      case 'serverUrl':
        if (!value) {
          errorMessage = 'Server URL is required';
          isValid = false;
        } else if (!this.isValidUrl(value)) {
          errorMessage = 'Please enter a valid URL';
          isValid = false;
        }
        break;
    }

    if (!isValid) {
      this.showFieldError(field, errorMessage);
    } else {
      this.showFieldValid(field);
    }

    return isValid;
  }

  showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    
    // Add error class to input
    field.classList.add('error');
    formGroup.classList.remove('field-valid');

    // Remove existing error message
    const existingError = formGroup.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }

    // Add error message
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
  }

  showFieldValid(field) {
    const formGroup = field.closest('.form-group');
    field.classList.remove('error');
    formGroup.classList.add('field-valid');
  }

  clearFieldError(field) {
    const formGroup = field.closest('.form-group');
    field.classList.remove('error');
    
    const errorElement = formGroup.querySelector('.form-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isStrongPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
  }

  selectDataSource(card) {
    // Remove selection from other cards
    document.querySelectorAll('.data-source-card').forEach(c => {
      c.classList.remove('selected');
    });

    // Select current card
    card.classList.add('selected');

    // Show configuration form
    const configForm = document.getElementById('configForm');
    const provider = card.dataset.provider;
    
    if (configForm) {
      configForm.style.display = 'block';
      configForm.innerHTML = this.getConfigFormHTML(provider);
      
      // Setup new form listeners
      configForm.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('blur', (e) => this.validateField(e.target));
        input.addEventListener('input', (e) => this.clearFieldError(e.target));
      });
    }

    // Enable next button
    const nextBtn = document.querySelector('.btn-next');
    if (nextBtn) {
      nextBtn.disabled = false;
    }
  }

  getConfigFormHTML(provider) {
    const configs = {
      github: `
        <h3>Configure GitHub Integration</h3>
        <div class="form-group">
          <label class="form-label" for="accessToken">Personal Access Token</label>
          <input type="password" class="form-input" id="accessToken" name="accessToken" 
                 placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" required>
          <div class="form-help">
            Create a token at <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a> 
            with repo and read:org permissions.
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="organization">Organization (optional)</label>
          <input type="text" class="form-input" id="organization" name="organization" 
                 placeholder="your-org-name">
          <div class="form-help">Leave blank to access all repositories you have access to.</div>
        </div>
      `,
      gitlab: `
        <h3>Configure GitLab Integration</h3>
        <div class="form-group">
          <label class="form-label" for="serverUrl">GitLab Server URL</label>
          <input type="url" class="form-input" id="serverUrl" name="serverUrl" 
                 value="https://gitlab.com" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="accessToken">Access Token</label>
          <input type="password" class="form-input" id="accessToken" name="accessToken" 
                 placeholder="glpat-xxxxxxxxxxxxxxxxxxxx" required>
          <div class="form-help">
            Create a token in GitLab Settings > Access Tokens with api scope.
          </div>
        </div>
      `,
      bitbucket: `
        <h3>Configure Bitbucket Integration</h3>
        <div class="form-group">
          <label class="form-label" for="username">Bitbucket Username</label>
          <input type="text" class="form-input" id="username" name="username" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="appPassword">App Password</label>
          <input type="password" class="form-input" id="appPassword" name="appPassword" required>
          <div class="form-help">
            Create an app password in Bitbucket Settings > App passwords with Repositories read permission.
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="workspace">Workspace</label>
          <input type="text" class="form-input" id="workspace" name="workspace" 
                 placeholder="your-workspace-name" required>
        </div>
      `
    };

    return configs[provider] || '';
  }

  loadMockData() {
    // Simulate loading repositories after data source configuration
    setTimeout(() => {
      if (document.getElementById('repositoryList')) {
        this.loadRepositories();
      }
    }, 100);
  }

  loadRepositories() {
    const repositories = [
      {
        id: 1,
        name: 'momentum-api',
        description: 'Core API service for Momentum platform',
        language: 'TypeScript',
        stars: 45,
        lastUpdated: '2 days ago',
        isPrivate: true
      },
      {
        id: 2,
        name: 'momentum-frontend',
        description: 'React-based frontend application',
        language: 'JavaScript',
        stars: 32,
        lastUpdated: '1 day ago',
        isPrivate: true
      },
      {
        id: 3,
        name: 'momentum-docs',
        description: 'Documentation and guides',
        language: 'Markdown',
        stars: 18,
        lastUpdated: '3 days ago',
        isPrivate: false
      },
      {
        id: 4,
        name: 'momentum-mobile',
        description: 'Mobile application for iOS and Android',
        language: 'React Native',
        stars: 28,
        lastUpdated: '5 days ago',
        isPrivate: true
      },
      {
        id: 5,
        name: 'momentum-cli',
        description: 'Command-line interface for Momentum',
        language: 'Go',
        stars: 15,
        lastUpdated: '1 week ago',
        isPrivate: false
      }
    ];

    this.renderRepositories(repositories);
  }

  renderRepositories(repositories) {
    const container = document.getElementById('repositoryList');
    if (!container) return;

    container.innerHTML = repositories.map(repo => `
      <div class="repository-item">
        <input type="checkbox" class="repository-checkbox" value="${repo.id}" 
               data-name="${repo.name}">
        <div class="repository-info">
          <div class="repository-name">${repo.name}</div>
          <div class="repository-description">${repo.description}</div>
          <div class="repository-meta">
            <span>📝 ${repo.language}</span>
            <span>⭐ ${repo.stars}</span>
            <span>🔒 ${repo.isPrivate ? 'Private' : 'Public'}</span>
            <span>📅 ${repo.lastUpdated}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Add change listeners to checkboxes
    container.querySelectorAll('.repository-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateSelectedRepositories());
    });
  }

  selectAllRepositories() {
    const checkboxes = document.querySelectorAll('.repository-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
      checkbox.checked = !allChecked;
    });

    this.updateSelectedRepositories();
  }

  updateSelectedRepositories() {
    const selected = Array.from(document.querySelectorAll('.repository-checkbox:checked'));
    const nextBtn = document.querySelector('.btn-next');
    
    if (nextBtn) {
      nextBtn.disabled = selected.length === 0;
    }

    // Update selected count
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
      countElement.textContent = `${selected.length} repositories selected`;
    }
  }

  filterRepositories(searchTerm) {
    const items = document.querySelectorAll('.repository-item');
    
    items.forEach(item => {
      const name = item.querySelector('.repository-name').textContent.toLowerCase();
      const description = item.querySelector('.repository-description').textContent.toLowerCase();
      const matches = name.includes(searchTerm.toLowerCase()) || 
                     description.includes(searchTerm.toLowerCase());
      
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  validateCurrentStep() {
    const currentStepElement = document.querySelector(`[data-step="${this.currentStep}"]`) || 
                              document.body;
    const inputs = currentStepElement.querySelectorAll('.form-input[required]');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    // Additional step-specific validation
    switch (this.currentStep) {
      case 2:
        const selectedDataSource = document.querySelector('.data-source-card.selected');
        if (!selectedDataSource) {
          this.showAlert('Please select a data source to continue.', 'warning');
          isValid = false;
        }
        break;

      case 3:
        const selectedRepos = document.querySelectorAll('.repository-checkbox:checked');
        if (selectedRepos.length === 0) {
          this.showAlert('Please select at least one repository to continue.', 'warning');
          isValid = false;
        }
        break;
    }

    return isValid;
  }

  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.saveCurrentStepData();

    if (this.currentStep < this.totalSteps) {
      this.navigateToStep(this.currentStep + 1);
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.navigateToStep(this.currentStep - 1);
    }
  }

  navigateToStep(stepNumber) {
    const pages = ['signup.html', 'data-sources.html', 'team-setup.html', 'review.html'];
    const targetPage = pages[stepNumber - 1];
    
    // Save current step before navigation
    this.currentStep = stepNumber;
    localStorage.setItem('onboardingStep', stepNumber);
    localStorage.setItem('onboardingData', JSON.stringify(this.formData));
    
    window.location.href = targetPage;
  }

  saveCurrentStepData() {
    const currentPage = window.location.pathname.split('/').pop();
    
    switch (currentPage) {
      case 'signup.html':
        this.formData.account = this.getFormData(['firstName', 'lastName', 'email', 'password', 'organizationName']);
        break;
        
      case 'data-sources.html':
        const selectedDataSource = document.querySelector('.data-source-card.selected');
        if (selectedDataSource) {
          this.formData.dataSource = {
            provider: selectedDataSource.dataset.provider,
            config: this.getFormData(['accessToken', 'organization', 'serverUrl', 'username', 'appPassword', 'workspace'])
          };
        }
        break;
        
      case 'team-setup.html':
        const selectedRepos = Array.from(document.querySelectorAll('.repository-checkbox:checked'));
        this.formData.repositories = selectedRepos.map(cb => ({
          id: cb.value,
          name: cb.dataset.name
        }));
        break;
    }

    localStorage.setItem('onboardingData', JSON.stringify(this.formData));
  }

  getFormData(fieldNames) {
    const data = {};
    fieldNames.forEach(name => {
      const field = document.querySelector(`[name="${name}"]`);
      if (field) {
        data[name] = field.value;
      }
    });
    return data;
  }

  loadSavedData() {
    const savedData = localStorage.getItem('onboardingData');
    const savedStep = localStorage.getItem('onboardingStep');
    
    if (savedData) {
      this.formData = JSON.parse(savedData);
    }
    
    if (savedStep) {
      this.currentStep = parseInt(savedStep);
    }

    // Populate review page if we're on it
    if (window.location.pathname.includes('review.html')) {
      this.populateReviewData();
    }
  }

  populateReviewData() {
    const data = this.formData;
    
    // Account information
    document.getElementById('reviewName').textContent = 
      `${data.account.firstName || ''} ${data.account.lastName || ''}`.trim();
    document.getElementById('reviewEmail').textContent = data.account.email || '';
    document.getElementById('reviewOrganization').textContent = data.account.organizationName || '';
    
    // Data source
    document.getElementById('reviewDataSource').textContent = 
      data.dataSource.provider ? data.dataSource.provider.charAt(0).toUpperCase() + data.dataSource.provider.slice(1) : '';
    
    // Repositories
    const repoList = document.getElementById('reviewRepositories');
    if (repoList && data.repositories) {
      repoList.innerHTML = data.repositories.map(repo => 
        `<div class="review-list-item">${repo.name}</div>`
      ).join('');
    }
    
    document.getElementById('reviewRepoCount').textContent = 
      data.repositories ? data.repositories.length : 0;
  }

  completeSetup() {
    const completeBtn = document.getElementById('completeSetup');
    if (completeBtn) {
      completeBtn.disabled = true;
      completeBtn.innerHTML = '<div class="spinner"></div> Setting up your account...';
    }

    // Simulate API call
    setTimeout(() => {
      this.showSuccessAnimation();
    }, 3000);
  }

  showSuccessAnimation() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="success-animation">
          <div class="success-icon">✓</div>
          <h2 class="step-title">Welcome to Momentum!</h2>
          <p class="step-subtitle">
            Your account has been successfully created and configured. 
            You'll be redirected to your dashboard in a few seconds.
          </p>
        </div>
      `;
    }

    // Clear saved data
    localStorage.removeItem('onboardingStep');
    localStorage.removeItem('onboardingData');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 4000);
  }

  handleSSOLogin(provider) {
    const ssoBtn = document.querySelector(`[data-provider="${provider}"]`);
    if (ssoBtn) {
      ssoBtn.innerHTML = '<div class="spinner"></div> Connecting...';
      ssoBtn.style.pointerEvents = 'none';
    }

    // Simulate SSO flow
    setTimeout(() => {
      // In a real app, this would redirect to the SSO provider
      alert(`SSO login with ${provider} would be initiated here.`);
      
      if (ssoBtn) {
        ssoBtn.innerHTML = `<img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/${provider}.svg" class="sso-icon"> Continue with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
        ssoBtn.style.pointerEvents = 'auto';
      }
    }, 1500);
  }

  showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.insertBefore(alert, mainContent.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }
}

// Initialize the wizard when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const wizard = new OnboardingWizard();
  wizard.loadSavedData();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
  location.reload();
});