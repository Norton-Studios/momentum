// Momentum Developer Productivity Platform - Interactive Functionality
// Focus on usability, accessibility, and clean user experience

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    const currentPage = getCurrentPage();
    
    // Initialize common functionality
    initializeDateRangeSelector();
    initializeFormValidation();
    initializeModals();
    initializeAccessibility();
    
    // Initialize page-specific functionality
    switch(currentPage) {
        case 'index':
            initializeDashboard();
            break;
        case 'signup':
            initializeSignup();
            break;
        case 'data-sources':
            initializeDataSources();
            break;
        case 'team-setup':
            initializeTeamSetup();
            break;
        case 'review':
            initializeReview();
            break;
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('.')[0];
    return filename || 'index';
}

// ================================
// Common Functionality
// ================================

function initializeDateRangeSelector() {
    const dateRangeOptions = document.querySelectorAll('.date-range-option');
    
    dateRangeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            dateRangeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Handle custom date picker
            if (this.dataset.range === 'custom') {
                openCustomDatePicker();
            } else {
                // Update data based on selected range
                updateDataForDateRange(this.dataset.range);
            }
        });
    });
}

function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearFieldError(input));
        });
    });
}

function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    // Custom validations
    if (form.id === 'signup-form') {
        isValid = validateSignupForm(form) && isValid;
    }
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const fieldType = field.type;
    const isRequired = field.hasAttribute('required');
    
    // Clear previous errors
    clearFieldError(field);
    
    // Required field validation
    if (isRequired && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Type-specific validation
    if (value) {
        switch (fieldType) {
            case 'email':
                if (!isValidEmail(value)) {
                    showFieldError(field, 'Please enter a valid email address');
                    return false;
                }
                break;
                
            case 'password':
                if (field.name === 'password' && value.length < 8) {
                    showFieldError(field, 'Password must be at least 8 characters long');
                    return false;
                }
                break;
                
            case 'url':
                if (!isValidUrl(value)) {
                    showFieldError(field, 'Please enter a valid URL');
                    return false;
                }
                break;
        }
    }
    
    return true;
}

function showFieldError(field, message) {
    field.classList.add('error');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

function clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.form-error');
    if (errorElement) {
        errorElement.remove();
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function initializeModals() {
    // Close modals when clicking outside or on close button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-backdrop') || 
            e.target.closest('.modal-close')) {
            closeAllModals();
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function closeAllModals() {
    const modals = document.querySelectorAll('[id$="-modal"]');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
}

function initializeAccessibility() {
    // Add ARIA attributes and keyboard navigation
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(button => {
        if (!button.hasAttribute('aria-label') && !button.textContent.trim()) {
            const icon = button.querySelector('svg');
            if (icon) {
                button.setAttribute('aria-label', 'Button');
            }
        }
    });
    
    // Focus management for modals
    const modals = document.querySelectorAll('[id$="-modal"]');
    modals.forEach(modal => {
        modal.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                handleModalTabNavigation(e, modal);
            }
        });
    });
}

function handleModalTabNavigation(e, modal) {
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
        if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        }
    } else {
        if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }
    }
}

// ================================
// Dashboard Functionality
// ================================

function initializeDashboard() {
    initializeViewTabs();
    initializeTeamCards();
    initializeContributorsTable();
    initializeBreadcrumbNavigation();
    generateCommitHeatmap();
}

function initializeViewTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const viewContents = document.querySelectorAll('.view-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetView = this.dataset.view;
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show target view
            viewContents.forEach(view => {
                if (view.id === `view-${targetView}`) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            });
            
            // Update URL without page reload
            updateUrlState({ view: targetView });
        });
    });
}

function initializeTeamCards() {
    const teamCards = document.querySelectorAll('[data-team]');
    
    teamCards.forEach(card => {
        card.addEventListener('click', function() {
            const teamName = this.dataset.team;
            showIndividualTeamView(teamName);
        });
    });
    
    // Back to teams button
    const backButton = document.getElementById('back-to-teams');
    if (backButton) {
        backButton.addEventListener('click', function() {
            hideIndividualTeamView();
        });
    }
}

function showIndividualTeamView(teamName) {
    const teamsComparison = document.querySelector('#view-teams > div:first-child');
    const individualView = document.getElementById('individual-team-view');
    const teamNameElement = document.getElementById('team-name');
    
    if (teamsComparison && individualView && teamNameElement) {
        teamsComparison.classList.add('hidden');
        individualView.classList.remove('hidden');
        teamNameElement.textContent = formatTeamName(teamName);
        
        // Update breadcrumb
        updateBreadcrumb('team', formatTeamName(teamName));
    }
}

function hideIndividualTeamView() {
    const teamsComparison = document.querySelector('#view-teams > div:first-child');
    const individualView = document.getElementById('individual-team-view');
    
    if (teamsComparison && individualView) {
        teamsComparison.classList.remove('hidden');
        individualView.classList.add('hidden');
        
        // Reset breadcrumb
        updateBreadcrumb('team', null);
    }
}

function initializeContributorsTable() {
    const contributorRows = document.querySelectorAll('[data-contributor]');
    
    contributorRows.forEach(row => {
        row.addEventListener('click', function() {
            const contributorName = this.dataset.contributor;
            showIndividualContributorView(contributorName);
        });
    });
    
    // Back to contributors button
    const backButton = document.getElementById('back-to-contributors');
    if (backButton) {
        backButton.addEventListener('click', function() {
            hideIndividualContributorView();
        });
    }
}

function showIndividualContributorView(contributorName) {
    const contributorsTable = document.querySelector('#view-contributors .card');
    const individualView = document.getElementById('individual-contributor-view');
    const contributorNameElement = document.getElementById('contributor-name');
    
    if (contributorsTable && individualView && contributorNameElement) {
        contributorsTable.classList.add('hidden');
        individualView.classList.remove('hidden');
        contributorNameElement.textContent = formatContributorName(contributorName);
        
        // Update breadcrumb
        updateBreadcrumb('contributor', formatContributorName(contributorName));
    }
}

function hideIndividualContributorView() {
    const contributorsTable = document.querySelector('#view-contributors .card');
    const individualView = document.getElementById('individual-contributor-view');
    
    if (contributorsTable && individualView) {
        contributorsTable.classList.remove('hidden');
        individualView.classList.add('hidden');
        
        // Reset breadcrumb
        updateBreadcrumb('contributor', null);
    }
}

function initializeBreadcrumbNavigation() {
    const breadcrumbButtons = document.querySelectorAll('[id^="breadcrumb-"]');
    
    breadcrumbButtons.forEach(button => {
        button.addEventListener('click', function() {
            const level = this.id.replace('breadcrumb-', '');
            navigateToBreadcrumbLevel(level);
        });
    });
}

function updateBreadcrumb(level, name) {
    const teamBreadcrumb = document.getElementById('breadcrumb-team');
    const contributorBreadcrumb = document.getElementById('breadcrumb-contributor');
    const arrow = document.getElementById('breadcrumb-arrow');
    
    if (level === 'team') {
        if (name) {
            teamBreadcrumb.textContent = name;
            teamBreadcrumb.classList.remove('hidden');
            if (arrow) arrow.classList.remove('hidden');
        } else {
            teamBreadcrumb.classList.add('hidden');
            if (arrow) arrow.classList.add('hidden');
        }
    } else if (level === 'contributor') {
        if (name) {
            contributorBreadcrumb.textContent = name;
            contributorBreadcrumb.classList.remove('hidden');
        } else {
            contributorBreadcrumb.classList.add('hidden');
        }
    }
}

function generateCommitHeatmap() {
    const heatmapContainer = document.querySelector('.heatmap-container');
    if (!heatmapContainer) return;
    
    // Clear existing content
    heatmapContainer.innerHTML = '';
    
    // Generate 30 days of sample data
    const days = 30;
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const commits = Math.floor(Math.random() * 20); // Random commits 0-19
        const intensity = Math.min(commits / 4, 5); // Scale to 0-5
        
        const dayElement = document.createElement('div');
        dayElement.className = 'heatmap-day';
        dayElement.dataset.commits = commits;
        dayElement.dataset.date = date.toISOString().split('T')[0];
        dayElement.style.width = '12px';
        dayElement.style.height = '12px';
        dayElement.style.borderRadius = '2px';
        dayElement.style.backgroundColor = getHeatmapColor(intensity);
        dayElement.title = `${commits} commits on ${date.toLocaleDateString()}`;
        
        heatmapContainer.appendChild(dayElement);
    }
}

function getHeatmapColor(intensity) {
    const colors = ['#eee', '#ccc', '#999', '#666', '#333', '#000'];
    return colors[Math.min(Math.floor(intensity), 5)];
}

// ================================
// Sign Up Functionality
// ================================

function initializeSignup() {
    initializeSSOButtons();
    initializePasswordConfirmation();
    initializeTeamSizeInfo();
}

function initializeSSOButtons() {
    const ssoButtons = document.querySelectorAll('.btn-sso');
    
    ssoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.dataset.provider;
            handleSSOLogin(provider);
        });
    });
}

function handleSSOLogin(provider) {
    // Show loading state
    const button = document.querySelector(`[data-provider="${provider}"]`);
    const originalText = button.textContent;
    button.textContent = 'Connecting...';
    button.disabled = true;
    
    // Simulate SSO flow
    setTimeout(() => {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;
        
        // Redirect to data sources (simulated)
        if (confirm(`SSO with ${formatProviderName(provider)} successful! Continue to data source configuration?`)) {
            window.location.href = 'data-sources.html';
        }
    }, 2000);
}

function initializePasswordConfirmation() {
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm-password');
    
    if (passwordField && confirmPasswordField) {
        confirmPasswordField.addEventListener('blur', function() {
            if (this.value && this.value !== passwordField.value) {
                showFieldError(this, 'Passwords do not match');
            }
        });
    }
}

function validateSignupForm(form) {
    const password = form.querySelector('#password').value;
    const confirmPassword = form.querySelector('#confirm-password').value;
    const terms = form.querySelector('#terms').checked;
    
    let isValid = true;
    
    if (password !== confirmPassword) {
        showFieldError(form.querySelector('#confirm-password'), 'Passwords do not match');
        isValid = false;
    }
    
    if (!terms) {
        showFieldError(form.querySelector('#terms'), 'You must agree to the terms of service');
        isValid = false;
    }
    
    return isValid;
}

function initializeTeamSizeInfo() {
    const teamSizeSelect = document.getElementById('team-size');
    if (teamSizeSelect) {
        teamSizeSelect.addEventListener('change', function() {
            updatePricingInfo(this.value);
        });
    }
}

function updatePricingInfo(teamSize) {
    // This would update pricing information based on team size
    console.log('Team size selected:', teamSize);
}

// ================================
// Data Sources Functionality
// ================================

function initializeDataSources() {
    initializeSourceSelection();
    initializeConnectionFlow();
    initializeSkipOptional();
    updateContinueButton();
}

function initializeSourceSelection() {
    const sourceCards = document.querySelectorAll('[data-source]');
    
    sourceCards.forEach(card => {
        card.addEventListener('click', function() {
            const source = this.dataset.source;
            const isRequired = this.dataset.required === 'true';
            
            if (isRequired) {
                openConnectionModal(source);
            } else {
                // Toggle optional source
                toggleOptionalSource(card, source);
            }
        });
    });
}

function toggleOptionalSource(card, source) {
    const isConnected = card.classList.contains('connected');
    
    if (isConnected) {
        // Disconnect
        card.classList.remove('connected');
        updateConnectedSourcesList();
    } else {
        // Connect
        openConnectionModal(source);
    }
}

function openConnectionModal(source) {
    const modal = document.getElementById('connection-modal');
    const title = document.getElementById('modal-title');
    const description = document.getElementById('modal-description');
    const form = document.getElementById('connection-form');
    const serverUrlGroup = document.getElementById('server-url-group');
    
    if (modal && title && description && form) {
        const sourceInfo = getSourceInfo(source);
        
        title.textContent = `Connect ${sourceInfo.name}`;
        description.textContent = sourceInfo.description;
        
        // Show/hide server URL field for self-hosted sources
        if (sourceInfo.requiresServerUrl) {
            serverUrlGroup.classList.remove('hidden');
        } else {
            serverUrlGroup.classList.add('hidden');
        }
        
        form.dataset.source = source;
        modal.classList.remove('hidden');
        
        // Focus first input
        const firstInput = form.querySelector('input');
        if (firstInput) firstInput.focus();
    }
}

function closeConnectionModal() {
    const modal = document.getElementById('connection-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function initializeConnectionFlow() {
    const connectionForm = document.getElementById('connection-form');
    
    if (connectionForm) {
        connectionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const source = this.dataset.source;
            const apiToken = document.getElementById('api-token').value;
            const serverUrl = document.getElementById('server-url').value;
            
            connectDataSource(source, apiToken, serverUrl);
        });
    }
}

function connectDataSource(source, apiToken, serverUrl) {
    const submitButton = document.querySelector('#connection-form button[type="submit"]');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.textContent = 'Connecting...';
    submitButton.disabled = true;
    
    // Simulate connection
    setTimeout(() => {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
        // Mark source as connected
        const sourceCard = document.querySelector(`[data-source="${source}"]`);
        if (sourceCard) {
            sourceCard.classList.add('connected');
            
            // Update button text
            const button = sourceCard.querySelector('.btn');
            if (button) {
                button.textContent = 'Connected';
                button.classList.replace('btn-secondary', 'btn-primary');
            }
        }
        
        updateConnectedSourcesList();
        closeConnectionModal();
        updateContinueButton();
        
        // Show success message
        showNotification(`Successfully connected to ${getSourceInfo(source).name}!`, 'success');
    }, 1500);
}

function initializeSkipOptional() {
    const skipButton = document.getElementById('skip-optional');
    
    if (skipButton) {
        skipButton.addEventListener('click', function() {
            // Ensure at least one required source is connected
            const requiredSources = document.querySelectorAll('[data-required="true"].connected');
            
            if (requiredSources.length > 0) {
                window.location.href = 'team-setup.html';
            } else {
                showNotification('Please connect at least one version control system before continuing.', 'error');
            }
        });
    }
}

function updateConnectedSourcesList() {
    const connectedSources = document.querySelectorAll('[data-source].connected');
    const connectedSourcesCard = document.getElementById('connected-sources');
    const connectedList = document.getElementById('connected-list');
    
    if (connectedSources.length > 0 && connectedSourcesCard && connectedList) {
        connectedSourcesCard.style.display = 'block';
        
        connectedList.innerHTML = '';
        connectedSources.forEach(source => {
            const sourceInfo = getSourceInfo(source.dataset.source);
            const listItem = createConnectedSourceItem(sourceInfo);
            connectedList.appendChild(listItem);
        });
    } else if (connectedSourcesCard) {
        connectedSourcesCard.style.display = 'none';
    }
}

function createConnectedSourceItem(sourceInfo) {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3 bg-hover rounded-lg';
    
    item.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-black rounded flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            </div>
            <div>
                <div class="font-medium">${sourceInfo.name}</div>
                <div class="text-xs text-medium">${sourceInfo.description}</div>
            </div>
        </div>
        <button class="btn btn-ghost btn-sm">Disconnect</button>
    `;
    
    return item;
}

function updateContinueButton() {
    const continueButton = document.getElementById('continue-setup');
    const requiredSources = document.querySelectorAll('[data-required="true"].connected');
    
    if (continueButton) {
        continueButton.disabled = requiredSources.length === 0;
        
        if (requiredSources.length > 0) {
            continueButton.addEventListener('click', function() {
                window.location.href = 'team-setup.html';
            });
        }
    }
}

function getSourceInfo(source) {
    const sourceMap = {
        'github': {
            name: 'GitHub',
            description: 'Access repositories and pull requests',
            requiresServerUrl: false
        },
        'gitlab': {
            name: 'GitLab',
            description: 'Access projects and merge requests',
            requiresServerUrl: true
        },
        'bitbucket': {
            name: 'Bitbucket',
            description: 'Access repositories and pull requests',
            requiresServerUrl: false
        },
        'jenkins': {
            name: 'Jenkins',
            description: 'Monitor build pipelines',
            requiresServerUrl: true
        },
        'jira': {
            name: 'Jira',
            description: 'Track issues and project management',
            requiresServerUrl: true
        },
        'sonarqube': {
            name: 'SonarQube',
            description: 'Code quality and security analysis',
            requiresServerUrl: true
        }
    };
    
    return sourceMap[source] || { name: source, description: '', requiresServerUrl: false };
}

// ================================
// Team Setup Functionality
// ================================

function initializeTeamSetup() {
    initializeRepositorySelection();
    initializeTeamCreation();
    initializeQuickSetup();
    initializeBulkActions();
    updateCounters();
}

function initializeRepositorySelection() {
    const repoCheckboxes = document.querySelectorAll('.repository-checkbox');
    const searchInput = document.getElementById('repo-search');
    
    repoCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectionCount);
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', filterRepositories);
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            filterRepositoriesByStatus(this.dataset.filter);
        });
    });
}

function updateSelectionCount() {
    const selectedRepos = document.querySelectorAll('.repository-checkbox:checked');
    const selectionCount = document.getElementById('selection-count');
    const bulkAssignButton = document.getElementById('bulk-assign');
    
    if (selectionCount) {
        selectionCount.textContent = `${selectedRepos.length} repositories selected`;
    }
    
    if (bulkAssignButton) {
        bulkAssignButton.disabled = selectedRepos.length === 0;
    }
}

function filterRepositories() {
    const searchQuery = document.getElementById('repo-search').value.toLowerCase();
    const repoItems = document.querySelectorAll('.repository-item');
    
    repoItems.forEach(item => {
        const repoName = item.querySelector('.repository-name').textContent.toLowerCase();
        const repoDescription = item.querySelector('.repository-description').textContent.toLowerCase();
        
        const matches = repoName.includes(searchQuery) || repoDescription.includes(searchQuery);
        item.style.display = matches ? 'flex' : 'none';
    });
}

function filterRepositoriesByStatus(status) {
    const repoItems = document.querySelectorAll('.repository-item');
    
    repoItems.forEach(item => {
        if (status === 'all') {
            item.style.display = 'flex';
        } else {
            // This would filter based on actual repository status
            item.style.display = 'flex';
        }
    });
}

function initializeBulkActions() {
    const selectAllButton = document.getElementById('select-all');
    const selectNoneButton = document.getElementById('select-none');
    const bulkAssignButton = document.getElementById('bulk-assign');
    
    if (selectAllButton) {
        selectAllButton.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.repository-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateSelectionCount();
        });
    }
    
    if (selectNoneButton) {
        selectNoneButton.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.repository-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateSelectionCount();
        });
    }
    
    if (bulkAssignButton) {
        bulkAssignButton.addEventListener('click', openAssignmentModal);
    }
}

function openAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    const teamSelection = document.getElementById('team-selection');
    
    if (modal && teamSelection) {
        // Populate team options
        populateTeamSelection(teamSelection);
        modal.classList.remove('hidden');
    }
}

function closeAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function populateTeamSelection(container) {
    // This would be populated with actual teams
    const sampleTeams = ['Frontend Team', 'Backend Team', 'Mobile Team', 'DevOps Team'];
    
    container.innerHTML = '';
    sampleTeams.forEach(team => {
        const option = document.createElement('div');
        option.className = 'form-radio';
        option.innerHTML = `
            <input type="radio" id="team-${team.toLowerCase().replace(/\s+/g, '-')}" name="assignmentTeam" value="${team}">
            <label for="team-${team.toLowerCase().replace(/\s+/g, '-')}">${team}</label>
        `;
        container.appendChild(option);
    });
}

function initializeTeamCreation() {
    const teamForm = document.getElementById('team-form');
    const assignmentMethodRadios = document.querySelectorAll('[name="assignmentMethod"]');
    
    if (teamForm) {
        teamForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createTeam();
        });
    }
    
    assignmentMethodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            toggleAssignmentMethodFields(this.value);
        });
    });
}

function toggleAssignmentMethodFields(method) {
    const regexGroup = document.getElementById('regex-pattern-group');
    const labelsGroup = document.getElementById('labels-group');
    
    // Hide all method-specific fields
    if (regexGroup) regexGroup.classList.add('hidden');
    if (labelsGroup) labelsGroup.classList.add('hidden');
    
    // Show relevant field
    if (method === 'regex' && regexGroup) {
        regexGroup.classList.remove('hidden');
    } else if (method === 'labels' && labelsGroup) {
        labelsGroup.classList.remove('hidden');
    }
}

function createTeam() {
    const form = document.getElementById('team-form');
    const formData = new FormData(form);
    
    const team = {
        name: formData.get('team-name'),
        description: formData.get('team-description'),
        assignmentMethod: formData.get('assignmentMethod'),
        regexPattern: formData.get('regex-pattern'),
        labels: formData.get('labels')
    };
    
    // Add team to created teams list
    addTeamToList(team);
    
    // Reset form
    form.reset();
    
    // Update counters
    updateCounters();
    
    showNotification(`Team "${team.name}" created successfully!`, 'success');
}

function addTeamToList(team) {
    const createdTeamsCard = document.getElementById('created-teams');
    const teamsList = document.getElementById('teams-list');
    
    if (createdTeamsCard && teamsList) {
        createdTeamsCard.style.display = 'block';
        
        const teamItem = document.createElement('div');
        teamItem.className = 'flex items-center justify-between p-4 border border-color-border rounded-lg';
        teamItem.innerHTML = `
            <div>
                <h4 class="font-semibold">${team.name}</h4>
                <p class="text-sm text-medium">${team.description}</p>
                <div class="text-xs text-light mt-1">
                    Assignment: ${formatAssignmentMethod(team.assignmentMethod)}
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs bg-hover px-2 py-1 rounded">0 repos</span>
                <button class="btn btn-ghost btn-sm">Edit</button>
                <button class="btn btn-ghost btn-sm">Delete</button>
            </div>
        `;
        
        teamsList.appendChild(teamItem);
    }
}

function initializeQuickSetup() {
    const quickSetupButtons = document.querySelectorAll('[data-quick-setup]');
    
    quickSetupButtons.forEach(button => {
        button.addEventListener('click', function() {
            const teamType = this.dataset.quickSetup;
            const teamConfig = getQuickSetupConfig(teamType);
            
            // Pre-fill form with quick setup data
            document.getElementById('team-name').value = teamConfig.name;
            document.getElementById('team-description').value = teamConfig.description;
            
            // Set regex pattern if available
            if (teamConfig.regexPattern) {
                document.getElementById('assign-regex').checked = true;
                toggleAssignmentMethodFields('regex');
                document.getElementById('regex-pattern').value = teamConfig.regexPattern;
            }
        });
    });
}

function getQuickSetupConfig(teamType) {
    const configs = {
        'frontend': {
            name: 'Frontend Team',
            description: 'Responsible for frontend development and user experience',
            regexPattern: '^(frontend|ui|web|client)-.*|.*-(frontend|ui|web|client)$'
        },
        'backend': {
            name: 'Backend Team',
            description: 'Core API services and business logic',
            regexPattern: '^(api|backend|service|server)-.*|.*-(api|backend|service|server)$'
        },
        'mobile': {
            name: 'Mobile Team',
            description: 'iOS and Android mobile applications',
            regexPattern: '^(mobile|ios|android)-.*|.*-(mobile|ios|android)$'
        },
        'devops': {
            name: 'DevOps Team',
            description: 'Infrastructure, deployment, and monitoring',
            regexPattern: '^(infra|deploy|docker|k8s|terraform)-.*|.*-(infra|deploy|ops)$'
        },
        'data': {
            name: 'Data Team',
            description: 'Analytics, ML, and data pipeline',
            regexPattern: '^(data|analytics|ml|etl)-.*|.*-(data|analytics|ml|pipeline)$'
        }
    };
    
    return configs[teamType] || {};
}

function updateCounters() {
    const teamsCreated = document.querySelectorAll('#teams-list > div').length;
    const reposAssigned = 0; // This would be calculated based on actual assignments
    
    const teamsCreatedCount = document.getElementById('teams-created-count');
    const reposAssignedCount = document.getElementById('repos-assigned-count');
    
    if (teamsCreatedCount) teamsCreatedCount.textContent = teamsCreated;
    if (reposAssignedCount) reposAssignedCount.textContent = reposAssigned;
    
    // Enable continue button if teams are created
    const continueButton = document.getElementById('continue-review');
    if (continueButton) {
        continueButton.disabled = teamsCreated === 0;
        
        if (teamsCreated > 0) {
            continueButton.addEventListener('click', function() {
                window.location.href = 'review.html';
            });
        }
    }
}

// ================================
// Review Functionality
// ================================

function initializeReview() {
    initializeSetupCompletion();
    initializeEditButtons();
}

function initializeSetupCompletion() {
    const completeButton = document.getElementById('complete-setup');
    
    if (completeButton) {
        completeButton.addEventListener('click', function() {
            completeSetup();
        });
    }
}

function completeSetup() {
    const button = document.getElementById('complete-setup');
    const originalText = button.textContent;
    
    // Show loading state
    button.textContent = 'Setting up your workspace...';
    button.disabled = true;
    
    // Simulate setup process
    setTimeout(() => {
        // Reset button state
        button.textContent = originalText;
        button.disabled = false;
        
        // Show completion modal
        openCompletionModal();
    }, 3000);
}

function openCompletionModal() {
    const modal = document.getElementById('completion-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeCompletionModal() {
    const modal = document.getElementById('completion-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function initializeEditButtons() {
    const editButtons = document.querySelectorAll('[onclick^="editStep"]');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const step = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            editConfigurationStep(step);
        });
    });
}

function editConfigurationStep(step) {
    const stepUrls = {
        'account': 'signup.html',
        'data-sources': 'data-sources.html',
        'team-setup': 'team-setup.html'
    };
    
    if (stepUrls[step]) {
        window.location.href = stepUrls[step];
    }
}

// ================================
// Utility Functions
// ================================

function formatTeamName(teamKey) {
    return teamKey.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Team';
}

function formatContributorName(contributorKey) {
    return contributorKey.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function formatProviderName(provider) {
    const providers = {
        'github': 'GitHub',
        'google': 'Google',
        'gitlab': 'GitLab'
    };
    return providers[provider] || provider;
}

function formatAssignmentMethod(method) {
    const methods = {
        'manual': 'Manual selection',
        'regex': 'Pattern matching',
        'labels': 'Repository labels'
    };
    return methods[method] || method;
}

function updateDataForDateRange(range) {
    // This would update dashboard data based on selected date range
    console.log('Updating data for range:', range);
}

function openCustomDatePicker() {
    // This would open a custom date picker modal
    console.log('Opening custom date picker');
}

function updateUrlState(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
    });
    window.history.replaceState({}, '', url);
}

function showNotification(message, type = 'info') {
    // Create and show a notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-black text-white' : 
        type === 'error' ? 'bg-white border border-black text-black' : 
        'bg-white border border-color-border text-black'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Global functions for onclick handlers
window.editStep = editConfigurationStep;
window.closeConnectionModal = closeConnectionModal;
window.closeAssignmentModal = closeAssignmentModal;
window.closeCompletionModal = closeCompletionModal;