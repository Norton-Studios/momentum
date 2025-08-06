// Dashboard JavaScript for Enterprise Blue Professional Theme
// Handles chart initialization, data updates, and interactive features

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Initialize all dashboard components
    initializeCharts();
    initializeEventListeners();
    initializeDataRefresh();
    
    // Simulate real-time updates
    startRealtimeUpdates();
});

// Chart instances storage
const chartInstances = {};

// Color scheme for charts (matching the Enterprise Blue theme)
const chartColors = {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    gradient: {
        primary: ['#2563eb', '#3b82f6'],
        success: ['#10b981', '#34d399'],
        warning: ['#f59e0b', '#fbbf24'],
        error: ['#ef4444', '#f87171']
    },
    cve: {
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#d97706',
        low: '#65a30d'
    }
};

// Sample data for charts
const sampleData = {
    velocity: {
        weekly: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
            datasets: [{
                label: 'Features Delivered',
                data: [23, 35, 28, 42, 38, 45],
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primary + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        monthly: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Features Delivered',
                data: [145, 168, 132, 178, 156, 189],
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primary + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        }
    },
    stability: {
        labels: ['Success', 'Failure'],
        datasets: [{
            data: [94.2, 5.8],
            backgroundColor: [chartColors.success, chartColors.error],
            borderWidth: 0,
            hoverOffset: 4
        }]
    },
    cve: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [
            {
                label: 'Critical',
                data: [5, 3, 2, 4, 3, 2, 3],
                backgroundColor: chartColors.cve.critical,
                borderColor: chartColors.cve.critical,
                borderWidth: 2
            },
            {
                label: 'High',
                data: [12, 8, 10, 9, 11, 7, 8],
                backgroundColor: chartColors.cve.high,
                borderColor: chartColors.cve.high,
                borderWidth: 2
            },
            {
                label: 'Medium',
                data: [18, 15, 20, 16, 14, 18, 12],
                backgroundColor: chartColors.cve.medium,
                borderColor: chartColors.cve.medium,
                borderWidth: 2
            },
            {
                label: 'Low',
                data: [8, 12, 9, 11, 10, 8, 7],
                backgroundColor: chartColors.cve.low,
                borderColor: chartColors.cve.low,
                borderWidth: 2
            }
        ]
    },
    team: {
        labels: ['Frontend', 'Backend', 'DevOps', 'QA', 'Security'],
        datasets: [{
            label: 'Performance Score',
            data: [85, 92, 78, 88, 91],
            backgroundColor: [
                chartColors.primary + '80',
                chartColors.success + '80',
                chartColors.warning + '80',
                chartColors.info + '80',
                chartColors.error + '80'
            ],
            borderColor: [
                chartColors.primary,
                chartColors.success,
                chartColors.warning,
                chartColors.info,
                chartColors.error
            ],
            borderWidth: 2
        }]
    }
};

// Initialize all charts
function initializeCharts() {
    initializeVelocityChart();
    initializeStabilityChart();
    initializeCVEChart();
    initializeTeamChart();
}

// Velocity Trend Chart
function initializeVelocityChart() {
    const ctx = document.getElementById('velocityChart').getContext('2d');
    
    chartInstances.velocity = new Chart(ctx, {
        type: 'line',
        data: sampleData.velocity.weekly,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: chartColors.primary,
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            },
            elements: {
                point: {
                    radius: 6,
                    hoverRadius: 8,
                    backgroundColor: chartColors.primary,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }
            }
        }
    });
}

// Pipeline Stability Chart
function initializeStabilityChart() {
    const ctx = document.getElementById('stabilityChart').getContext('2d');
    
    chartInstances.stability = new Chart(ctx, {
        type: 'doughnut',
        data: sampleData.stability,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: chartColors.primary,
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// CVE Tracking Chart
function initializeCVEChart() {
    const ctx = document.getElementById('cveChart').getContext('2d');
    
    chartInstances.cve = new Chart(ctx, {
        type: 'bar',
        data: sampleData.cve,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        color: '#64748b'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: chartColors.primary,
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

// Team Performance Chart
function initializeTeamChart() {
    const ctx = document.getElementById('teamChart').getContext('2d');
    
    chartInstances.team = new Chart(ctx, {
        type: 'radar',
        data: sampleData.team,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: chartColors.primary,
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: '#e2e8f0'
                    },
                    pointLabels: {
                        color: '#64748b',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        display: false
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 3
                },
                point: {
                    radius: 6,
                    hoverRadius: 8
                }
            }
        }
    });
}

// Event listeners for interactive elements
function initializeEventListeners() {
    // Date range selector
    const dateRangeSelect = document.getElementById('dateRange');
    dateRangeSelect.addEventListener('change', handleDateRangeChange);
    
    // Refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    refreshBtn.addEventListener('click', handleRefresh);
    
    // Chart control buttons
    const chartBtns = document.querySelectorAll('.chart-btn');
    chartBtns.forEach(btn => {
        btn.addEventListener('click', handleChartToggle);
    });
    
    // Team selector
    const teamSelector = document.querySelector('.team-selector');
    teamSelector.addEventListener('change', handleTeamChange);
    
    // Search input
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', handleSearch);
    
    // Export button
    const exportBtn = document.querySelector('.export-btn');
    exportBtn.addEventListener('click', handleExport);
    
    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
}

// Handle date range changes
function handleDateRangeChange(event) {
    const selectedRange = event.target.value;
    console.log('Date range changed to:', selectedRange);
    
    // Simulate data refresh with loading state
    showLoadingState();
    
    setTimeout(() => {
        updateChartsForDateRange(selectedRange);
        hideLoadingState();
        showNotification('Data updated for ' + getDateRangeLabel(selectedRange), 'success');
    }, 1000);
}

// Handle refresh button click
function handleRefresh() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const icon = refreshBtn.querySelector('i');
    
    // Add rotation animation
    icon.style.animation = 'spin 1s linear infinite';
    refreshBtn.disabled = true;
    
    // Simulate data refresh
    setTimeout(() => {
        refreshAllData();
        icon.style.animation = '';
        refreshBtn.disabled = false;
        showNotification('Dashboard data refreshed successfully', 'success');
    }, 1500);
}

// Handle chart toggle buttons
function handleChartToggle(event) {
    const btn = event.currentTarget;
    const chartType = btn.dataset.chart;
    const dataType = btn.dataset.type;
    
    // Update button states
    const parentBtns = btn.parentElement.querySelectorAll('.chart-btn');
    parentBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update chart data
    if (chartType === 'velocity' && chartInstances.velocity) {
        chartInstances.velocity.data = sampleData.velocity[dataType];
        chartInstances.velocity.update('active');
    }
}

// Handle team selector change
function handleTeamChange(event) {
    const selectedTeam = event.target.value;
    console.log('Team changed to:', selectedTeam);
    
    // Update team performance chart based on selection
    updateTeamChart(selectedTeam);
}

// Handle search input
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    
    tableRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Handle export button
function handleExport() {
    showNotification('Preparing export... This may take a moment.', 'info');
    
    // Simulate export process
    setTimeout(() => {
        // In a real application, this would generate and download a file
        const data = gatherExportData();
        console.log('Export data:', data);
        showNotification('Export completed successfully', 'success');
    }, 2000);
}

// Handle navigation clicks
function handleNavigation(event) {
    event.preventDefault();
    
    // Update active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const pageName = event.currentTarget.querySelector('span').textContent;
    showNotification(`Navigating to ${pageName}...`, 'info');
}

// Data refresh functionality
function initializeDataRefresh() {
    // Set up periodic data refresh every 5 minutes
    setInterval(() => {
        refreshAllData(true); // silent refresh
    }, 300000);
}

// Refresh all dashboard data
function refreshAllData(silent = false) {
    // Update metric cards
    updateMetricCards();
    
    // Update charts
    updateAllCharts();
    
    // Update activity table
    updateActivityTable();
    
    if (!silent) {
        console.log('Dashboard data refreshed');
    }
}

// Update metric cards with new data
function updateMetricCards() {
    const metrics = [
        { selector: '.metric-card:nth-child(1) .metric-value', value: Math.floor(Math.random() * 50) + 10 },
        { selector: '.metric-card:nth-child(2) .metric-value', value: (Math.random() * 10 + 90).toFixed(1) + '%' },
        { selector: '.metric-card:nth-child(3) .metric-value', value: Math.floor(Math.random() * 100) + 100 },
        { selector: '.metric-card:nth-child(4) .metric-value', value: ['A+', 'A', 'A-', 'B+'][Math.floor(Math.random() * 4)] }
    ];
    
    metrics.forEach(metric => {
        const element = document.querySelector(metric.selector);
        if (element) {
            element.textContent = metric.value;
        }
    });
}

// Update all charts with new data
function updateAllCharts() {
    Object.keys(chartInstances).forEach(chartKey => {
        const chart = chartInstances[chartKey];
        if (chart && chart.data) {
            // Generate new random data while maintaining structure
            chart.data.datasets.forEach(dataset => {
                if (Array.isArray(dataset.data)) {
                    dataset.data = dataset.data.map(() => 
                        Math.floor(Math.random() * 50) + 10
                    );
                }
            });
            chart.update('none');
        }
    });
}

// Update activity table with new entries
function updateActivityTable() {
    const tbody = document.querySelector('.data-table tbody');
    if (tbody && Math.random() > 0.7) { // 30% chance to add new activity
        const newActivity = generateRandomActivity();
        const newRow = createActivityRow(newActivity);
        tbody.insertBefore(newRow, tbody.firstChild);
        
        // Remove last row if too many
        if (tbody.children.length > 10) {
            tbody.removeChild(tbody.lastChild);
        }
    }
}

// Generate random activity data
function generateRandomActivity() {
    const activities = [
        { type: 'git-merge', text: 'Merge Request #' + Math.floor(Math.random() * 9999), team: 'Frontend', status: 'success', impact: 'medium' },
        { type: 'shield-alert', text: 'CVE-2024-' + Math.floor(Math.random() * 9999), team: 'Security', status: 'warning', impact: 'high' },
        { type: 'play-circle', text: 'Pipeline #' + Math.floor(Math.random() * 999), team: 'Backend', status: 'info', impact: 'low' },
        { type: 'users', text: 'Team Member Added', team: 'DevOps', status: 'success', impact: 'low' }
    ];
    
    const activity = activities[Math.floor(Math.random() * activities.length)];
    activity.time = 'Just now';
    return activity;
}

// Create activity table row
function createActivityRow(activity) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <div class="activity-info">
                <i data-lucide="${activity.type}"></i>
                <span>${activity.text}</span>
            </div>
        </td>
        <td>${activity.team}</td>
        <td><span class="status-badge ${activity.status}">${activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}</span></td>
        <td><span class="impact-badge ${activity.impact}">${activity.impact.charAt(0).toUpperCase() + activity.impact.slice(1)}</span></td>
        <td>${activity.time}</td>
    `;
    
    // Initialize icons for the new row
    lucide.createIcons();
    
    return row;
}

// Real-time updates simulation
function startRealtimeUpdates() {
    // Simulate real-time metric updates every 30 seconds
    setInterval(() => {
        updateMetricCards();
    }, 30000);
    
    // Simulate new activities every 2 minutes
    setInterval(() => {
        updateActivityTable();
    }, 120000);
}

// Utility functions
function updateChartsForDateRange(dateRange) {
    // Simulate different data based on date range
    const multiplier = getDateRangeMultiplier(dateRange);
    
    Object.keys(chartInstances).forEach(chartKey => {
        const chart = chartInstances[chartKey];
        if (chart && chart.data) {
            chart.data.datasets.forEach(dataset => {
                if (Array.isArray(dataset.data)) {
                    dataset.data = dataset.data.map(value => 
                        Math.floor(value * multiplier)
                    );
                }
            });
            chart.update('active');
        }
    });
}

function getDateRangeMultiplier(dateRange) {
    const multipliers = {
        '7d': 0.8,
        '30d': 1.0,
        '90d': 1.3,
        '6m': 1.8,
        '1y': 2.5
    };
    return multipliers[dateRange] || 1.0;
}

function getDateRangeLabel(dateRange) {
    const labels = {
        '7d': 'last 7 days',
        '30d': 'last 30 days',
        '90d': 'last 90 days',
        '6m': 'last 6 months',
        '1y': 'last year'
    };
    return labels[dateRange] || 'selected period';
}

function updateTeamChart(selectedTeam) {
    if (!chartInstances.team) return;
    
    if (selectedTeam === 'all') {
        chartInstances.team.data = sampleData.team;
    } else {
        // Filter data for specific team
        const teamIndex = sampleData.team.labels.findIndex(label => 
            label.toLowerCase() === selectedTeam
        );
        
        if (teamIndex !== -1) {
            chartInstances.team.data = {
                labels: [sampleData.team.labels[teamIndex]],
                datasets: [{
                    ...sampleData.team.datasets[0],
                    data: [sampleData.team.datasets[0].data[teamIndex]]
                }]
            };
        }
    }
    
    chartInstances.team.update('active');
}

function gatherExportData() {
    return {
        metrics: {
            cveCount: document.querySelector('.metric-card:nth-child(1) .metric-value').textContent,
            pipelineStability: document.querySelector('.metric-card:nth-child(2) .metric-value').textContent,
            deliveryVelocity: document.querySelector('.metric-card:nth-child(3) .metric-value').textContent,
            codeQuality: document.querySelector('.metric-card:nth-child(4) .metric-value').textContent
        },
        dateRange: document.getElementById('dateRange').value,
        timestamp: new Date().toISOString()
    };
}

function showLoadingState() {
    // Add loading overlays to charts
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        if (!container.querySelector('.loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            `;
            container.appendChild(overlay);
        }
    });
}

function hideLoadingState() {
    const overlays = document.querySelectorAll('.loading-overlay');
    overlays.forEach(overlay => overlay.remove());
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
        max-width: 300px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    `;
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#2563eb'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add CSS for loading spinner
const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e2e8f0;
        border-top: 4px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);