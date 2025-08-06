// Dashboard JavaScript for Momentum - Purple & Teal Theme
// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Main dashboard initialization
function initializeDashboard() {
    setupEventListeners();
    initializeCharts();
    loadMetricData();
    startDataRefresh();
    addAnimations();
}

// Event Listeners Setup
function setupEventListeners() {
    // Menu toggle for mobile
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Date range selector
    const dateRange = document.getElementById('dateRange');
    if (dateRange) {
        dateRange.addEventListener('change', (e) => {
            handleDateRangeChange(e.target.value);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefresh);
    }

    // Chart control buttons
    const chartBtns = document.querySelectorAll('.chart-btn');
    chartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleChartToggle(e.target);
        });
    });

    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            handleNavigation(e.currentTarget);
        });
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Chart Initialization
let charts = {};

function initializeCharts() {
    // Set Chart.js defaults for theme
    Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.color = '#6B7280';
    Chart.defaults.borderColor = '#E5E7EB';
    Chart.defaults.backgroundColor = 'rgba(139, 95, 191, 0.1)';

    // Initialize all charts
    initializeVelocityChart();
    initializePipelineChart();
    initializeSecurityChart();
    initializeTeamChart();
}

// Velocity Chart (Line Chart)
function initializeVelocityChart() {
    const ctx = document.getElementById('velocityChart');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(139, 95, 191, 0.3)');
    gradient.addColorStop(1, 'rgba(79, 209, 199, 0.1)');

    charts.velocity = new Chart(ctx, {
        type: 'line',
        data: {
            labels: generateDateLabels(30),
            datasets: [{
                label: 'Delivery Velocity',
                data: generateVelocityData(30),
                borderColor: '#8B5FBF',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8B5FBF',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#8B5FBF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(229, 231, 235, 0.5)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Pipeline Chart (Doughnut Chart)
function initializePipelineChart() {
    const ctx = document.getElementById('pipelineChart');
    if (!ctx) return;

    charts.pipeline = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Successful', 'Failed', 'Cancelled'],
            datasets: [{
                data: [85, 10, 5],
                backgroundColor: [
                    '#10B981',
                    '#EF4444',
                    '#F59E0B'
                ],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
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

// Security Chart (Bar Chart)
function initializeSecurityChart() {
    const ctx = document.getElementById('securityChart');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, '#EF4444');
    gradient.addColorStop(1, '#FF6B6B');

    charts.security = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
            datasets: [{
                label: 'Vulnerabilities',
                data: [2, 8, 15, 23, 12],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(249, 115, 22, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(59, 130, 246, 0.8)'
                ],
                borderColor: [
                    '#EF4444',
                    '#F97316',
                    '#F59E0B',
                    '#22C55E',
                    '#3B82F6'
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(229, 231, 235, 0.5)'
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                }
            }
        }
    });
}

// Team Performance Chart (Radar Chart)
function initializeTeamChart() {
    const ctx = document.getElementById('teamChart');
    if (!ctx) return;

    charts.team = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Code Quality', 'Velocity', 'Collaboration', 'Testing', 'Documentation', 'Innovation'],
            datasets: [{
                label: 'Team Alpha',
                data: [85, 90, 78, 92, 65, 88],
                borderColor: '#8B5FBF',
                backgroundColor: 'rgba(139, 95, 191, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#8B5FBF',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }, {
                label: 'Team Beta',
                data: [78, 85, 88, 80, 75, 82],
                borderColor: '#4FD1C7',
                backgroundColor: 'rgba(79, 209, 199, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#4FD1C7',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    cornerRadius: 8
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(229, 231, 235, 0.5)'
                    },
                    pointLabels: {
                        color: '#6B7280',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });
}

// Data Loading and Management
function loadMetricData() {
    // Simulate loading metric data
    animateCounter('cveCount', 23, 2000);
    animateCounter('pipelineStability', 94.2, 2000, '%');
    animateCounter('deliveryVelocity', 156, 2000);
    animateCounter('codeQuality', 8.7, 2000);
}

// Counter Animation
function animateCounter(elementId, targetValue, duration, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const increment = targetValue / (duration / 16);
    let currentValue = startValue;

    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        
        const displayValue = suffix === '%' ? currentValue.toFixed(1) : Math.floor(currentValue);
        element.textContent = displayValue + suffix;
    }, 16);
}

// Event Handlers
function handleDateRangeChange(days) {
    console.log(`Date range changed to: ${days} days`);
    
    // Update charts with new data based on date range
    if (charts.velocity) {
        const newLabels = generateDateLabels(parseInt(days));
        const newData = generateVelocityData(parseInt(days));
        
        charts.velocity.data.labels = newLabels;
        charts.velocity.data.datasets[0].data = newData;
        charts.velocity.update('active');
    }
    
    // Show loading state
    showLoadingState();
    
    // Simulate API call delay
    setTimeout(() => {
        hideLoadingState();
        loadMetricData();
    }, 1000);
}

function handleRefresh() {
    console.log('Refreshing dashboard data...');
    
    showLoadingState();
    
    // Simulate refresh delay
    setTimeout(() => {
        hideLoadingState();
        loadMetricData();
        updateCharts();
        addNewActivityItem();
    }, 1500);
}

function handleChartToggle(button) {
    // Remove active class from all buttons
    const chartBtns = button.parentNode.querySelectorAll('.chart-btn');
    chartBtns.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    button.classList.add('active');
    
    const chartType = button.dataset.chart;
    console.log(`Chart toggled to: ${chartType}`);
    
    // Update chart based on selection
    if (chartType === 'commits' && charts.velocity) {
        charts.velocity.data.datasets[0].label = 'Commits';
        charts.velocity.data.datasets[0].data = generateCommitData(30);
        charts.velocity.update();
    } else if (chartType === 'velocity' && charts.velocity) {
        charts.velocity.data.datasets[0].label = 'Delivery Velocity';
        charts.velocity.data.datasets[0].data = generateVelocityData(30);
        charts.velocity.update();
    }
}

function handleNavigation(navItem) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // Add active class to clicked item
    navItem.classList.add('active');
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('open');
    }
}

// Utility Functions
function generateDateLabels(days) {
    const labels = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
}

function generateVelocityData(days) {
    const data = [];
    for (let i = 0; i < days; i++) {
        data.push(Math.floor(Math.random() * 50) + 100 + Math.sin(i / 7) * 20);
    }
    return data;
}

function generateCommitData(days) {
    const data = [];
    for (let i = 0; i < days; i++) {
        data.push(Math.floor(Math.random() * 20) + 10 + Math.sin(i / 5) * 5);
    }
    return data;
}

function updateCharts() {
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.update === 'function') {
            chart.update('active');
        }
    });
}

function showLoadingState() {
    document.body.classList.add('loading');
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
    }
}

function hideLoadingState() {
    document.body.classList.remove('loading');
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.disabled = false;
    }
}

function addAnimations() {
    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.metric-card, .chart-container, .activity-container');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animate-fade-in-up');
        }, index * 100);
    });
}

function addNewActivityItem() {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;
    
    const activities = [
        {
            icon: 'fas fa-code-branch',
            iconClass: 'commit-icon',
            title: 'New feature branch created',
            user: 'alice.wilson',
            time: 'Just now'
        },
        {
            icon: 'fas fa-bug',
            iconClass: 'build-icon',
            title: 'Bug fix deployed to production',
            user: 'bob.johnson',
            time: '1 minute ago'
        },
        {
            icon: 'fas fa-star',
            iconClass: 'pr-icon',
            title: 'Code review completed',
            user: 'carol.smith',
            time: '2 minutes ago'
        }
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item animate-fade-in-up';
    activityItem.innerHTML = `
        <div class="activity-icon ${randomActivity.iconClass}">
            <i class="${randomActivity.icon}"></i>
        </div>
        <div class="activity-content">
            <div class="activity-title">${randomActivity.title}</div>
            <div class="activity-meta">
                <span class="activity-user">${randomActivity.user}</span>
                <span class="activity-time">${randomActivity.time}</span>
            </div>
        </div>
    `;
    
    activityFeed.insertBefore(activityItem, activityFeed.firstChild);
    
    // Remove last item if more than 5 items
    const items = activityFeed.querySelectorAll('.activity-item');
    if (items.length > 5) {
        activityFeed.removeChild(items[items.length - 1]);
    }
}

// Auto-refresh data every 30 seconds
function startDataRefresh() {
    setInterval(() => {
        if (!document.body.classList.contains('loading')) {
            updateCharts();
            
            // Occasionally add new activity
            if (Math.random() < 0.3) {
                addNewActivityItem();
            }
        }
    }, 30000);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.querySelector('.sidebar').classList.remove('open');
    }
    
    // Update charts on resize
    setTimeout(() => {
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }, 300);
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R for refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
    }
    
    // Escape to close sidebar on mobile
    if (e.key === 'Escape' && window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('open');
    }
});

// Performance monitoring
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up');
        }
    });
}, {
    threshold: 0.1
});

// Observe all chart containers for lazy animation
document.querySelectorAll('.chart-container').forEach(container => {
    observer.observe(container);
});

console.log('Momentum Dashboard initialized successfully!');