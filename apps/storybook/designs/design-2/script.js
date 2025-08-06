// Initialize Feather Icons
document.addEventListener('DOMContentLoaded', function() {
    feather.replace();
    initializeCharts();
    initializeEventListeners();
});

// Chart.js Configuration
Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
Chart.defaults.color = '#525252';
Chart.defaults.borderColor = '#e5e5e5';

// Color Palette
const colors = {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    success: '#16a34a',
    successLight: '#22c55e',
    warning: '#d97706',
    warningLight: '#f59e0b',
    danger: '#dc2626',
    dangerLight: '#ef4444',
    gray200: '#e5e5e5',
    gray300: '#d4d4d4',
    gray500: '#737373'
};

// Sample Data
const sampleData = {
    stabilityTrend: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        data: [88.5, 92.1, 89.7, 94.2, 91.8, 95.1, 93.6, 94.2]
    },
    velocityData: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        data: [42, 38, 45, 52, 49, 44, 51, 47]
    },
    cveData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        critical: [2, 1, 3, 2, 1, 0, 1, 2, 1, 0, 1, 1],
        high: [8, 6, 9, 7, 5, 4, 6, 8, 5, 3, 4, 5],
        medium: [15, 12, 18, 14, 11, 8, 12, 15, 10, 7, 9, 12],
        low: [25, 20, 28, 22, 18, 15, 20, 25, 16, 12, 15, 18]
    }
};

// Chart Instances
let stabilityChart = null;
let velocityChart = null;
let cveChart = null;

// Initialize all charts
function initializeCharts() {
    createStabilityChart();
    createVelocityChart();
    createCVEChart();
}

// Pipeline Stability Chart
function createStabilityChart() {
    const ctx = document.getElementById('stabilityChart').getContext('2d');
    
    stabilityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sampleData.stabilityTrend.labels,
            datasets: [{
                label: 'Pipeline Stability (%)',
                data: sampleData.stabilityTrend.data,
                borderColor: colors.success,
                backgroundColor: colors.success + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors.success,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
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
                    backgroundColor: '#ffffff',
                    titleColor: '#171717',
                    bodyColor: '#525252',
                    borderColor: colors.gray200,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y}% success rate`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: colors.gray500,
                        font: {
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: false,
                    min: 80,
                    max: 100,
                    grid: {
                        color: colors.gray200,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: colors.gray500,
                        font: {
                            weight: '500'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            elements: {
                point: {
                    hoverBackgroundColor: colors.success
                }
            }
        }
    });
}

// Delivery Velocity Chart
function createVelocityChart() {
    const ctx = document.getElementById('velocityChart').getContext('2d');
    
    velocityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sampleData.velocityData.labels,
            datasets: [{
                label: 'Deployments',
                data: sampleData.velocityData.data,
                backgroundColor: colors.primary + '90',
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 6,
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
                    backgroundColor: '#ffffff',
                    titleColor: '#171717',
                    bodyColor: '#525252',
                    borderColor: colors.gray200,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} deployments`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: colors.gray500,
                        font: {
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: colors.gray200,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: colors.gray500,
                        font: {
                            weight: '500'
                        }
                    }
                }
            }
        }
    });
}

// CVE Chart
function createCVEChart() {
    const ctx = document.getElementById('cveChart').getContext('2d');
    
    cveChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sampleData.cveData.labels,
            datasets: [
                {
                    label: 'Critical',
                    data: sampleData.cveData.critical,
                    backgroundColor: colors.danger,
                    borderRadius: 4,
                    borderSkipped: false
                },
                {
                    label: 'High',
                    data: sampleData.cveData.high,
                    backgroundColor: colors.warning,
                    borderRadius: 4,
                    borderSkipped: false
                },
                {
                    label: 'Medium',
                    data: sampleData.cveData.medium,
                    backgroundColor: colors.primary,
                    borderRadius: 4,
                    borderSkipped: false
                },
                {
                    label: 'Low',
                    data: sampleData.cveData.low,
                    backgroundColor: colors.success,
                    borderRadius: 4,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#171717',
                    bodyColor: '#525252',
                    borderColor: colors.gray200,
                    borderWidth: 1,
                    cornerRadius: 8,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        afterTitle: function() {
                            return '';
                        },
                        label: function(context) {
                            const severityLabels = {
                                'Critical': 'Critical',
                                'High': 'High', 
                                'Medium': 'Medium',
                                'Low': 'Low'
                            };
                            return `${severityLabels[context.dataset.label]}: ${context.parsed.y} CVEs`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: colors.gray500,
                        font: {
                            weight: '500'
                        }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        color: colors.gray200,
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: colors.gray500,
                        font: {
                            weight: '500'
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

// Event Listeners
function initializeEventListeners() {
    // Date range selector
    const dateRangeSelect = document.getElementById('dateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', handleDateRangeChange);
    }

    // Chart filter buttons
    const chartFilters = document.querySelectorAll('.chart-filter');
    chartFilters.forEach(button => {
        button.addEventListener('click', handleChartFilterChange);
    });

    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Metric cards hover effects
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
        card.addEventListener('mouseenter', handleMetricCardHover);
        card.addEventListener('mouseleave', handleMetricCardLeave);
    });
}

// Event Handlers
function handleDateRangeChange(event) {
    const selectedPeriod = event.target.value;
    console.log('Date range changed to:', selectedPeriod + ' days');
    
    // Simulate loading state
    document.body.classList.add('loading');
    
    // Update charts with new data (simulate API call)
    setTimeout(() => {
        updateChartsForPeriod(selectedPeriod);
        document.body.classList.remove('loading');
    }, 500);
}

function handleChartFilterChange(event) {
    const button = event.target;
    const chartContainer = button.closest('.chart-container');
    const period = button.dataset.period;
    
    // Update active state
    chartContainer.querySelectorAll('.chart-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    console.log('Chart filter changed to:', period);
    
    // Update chart data based on period
    updateChartForPeriod(chartContainer, period);
}

function handleNavigation(event) {
    event.preventDefault();
    
    // Update active navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = event.currentTarget.closest('.nav-item');
    navItem.classList.add('active');
    
    const page = event.currentTarget.querySelector('span').textContent;
    console.log('Navigated to:', page);
}

function handleMetricCardHover(event) {
    const card = event.currentTarget;
    const icon = card.querySelector('.metric-icon');
    
    // Add subtle animation
    icon.style.transform = 'scale(1.05)';
    icon.style.transition = 'transform 0.2s ease';
}

function handleMetricCardLeave(event) {
    const card = event.currentTarget;
    const icon = card.querySelector('.metric-icon');
    
    // Reset animation
    icon.style.transform = 'scale(1)';
}

// Update functions
function updateChartsForPeriod(period) {
    // Generate different data based on period
    const multiplier = period === '7' ? 0.8 : period === '90' ? 1.3 : period === '365' ? 1.8 : 1;
    
    // Update stability chart
    if (stabilityChart) {
        const newData = sampleData.stabilityTrend.data.map(value => 
            Math.min(100, Math.max(75, value + (Math.random() - 0.5) * 5 * multiplier))
        );
        stabilityChart.data.datasets[0].data = newData;
        stabilityChart.update('active');
    }
    
    // Update velocity chart
    if (velocityChart) {
        const newData = sampleData.velocityData.data.map(value => 
            Math.max(0, Math.round(value * multiplier + (Math.random() - 0.5) * 10))
        );
        velocityChart.data.datasets[0].data = newData;
        velocityChart.update('active');
    }
    
    // Update CVE chart
    if (cveChart) {
        cveChart.data.datasets.forEach((dataset, index) => {
            const baseData = Object.values(sampleData.cveData)[index + 1];
            dataset.data = baseData.map(value => 
                Math.max(0, Math.round(value * multiplier + (Math.random() - 0.5) * 3))
            );
        });
        cveChart.update('active');
    }
    
    // Update metric cards
    updateMetricCards(period);
}

function updateChartForPeriod(container, period) {
    // Simulate different time periods for individual charts
    const chartCanvas = container.querySelector('canvas');
    if (!chartCanvas) return;
    
    const chartId = chartCanvas.id;
    let chart = null;
    
    switch (chartId) {
        case 'stabilityChart':
            chart = stabilityChart;
            break;
        case 'velocityChart':
            chart = velocityChart;
            break;
        case 'cveChart':
            chart = cveChart;
            break;
    }
    
    if (chart) {
        // Generate period-specific labels
        let labels = [];
        switch (period) {
            case 'week':
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                break;
            case 'month':
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                break;
            case 'quarter':
                labels = ['Jan', 'Feb', 'Mar'];
                break;
        }
        
        chart.data.labels = labels;
        
        // Generate new data for the period
        chart.data.datasets.forEach(dataset => {
            dataset.data = labels.map(() => 
                Math.round(Math.random() * 50 + 20)
            );
        });
        
        chart.update('active');
    }
}

function updateMetricCards(period) {
    const cards = document.querySelectorAll('.metric-card');
    
    cards.forEach(card => {
        const valueElement = card.querySelector('.value');
        const changeElement = card.querySelector('.change');
        
        if (valueElement && changeElement) {
            // Simulate different values based on period
            const currentValue = valueElement.textContent;
            const isPercentage = currentValue.includes('%');
            const baseValue = parseFloat(currentValue);
            
            let newValue, changeValue;
            
            if (isPercentage) {
                newValue = Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * 10));
                changeValue = ((newValue - baseValue) / baseValue * 100).toFixed(1);
                valueElement.textContent = newValue.toFixed(1) + '%';
            } else {
                newValue = Math.max(0, Math.round(baseValue + (Math.random() - 0.5) * 20));
                changeValue = ((newValue - baseValue) / baseValue * 100).toFixed(0);
                valueElement.textContent = newValue.toString();
            }
            
            // Update change indicator
            const changeSign = changeValue >= 0 ? '+' : '';
            changeElement.textContent = changeSign + changeValue + '%';
            changeElement.className = 'change ' + (changeValue >= 0 ? 'positive' : 'negative');
        }
    });
}

// Utility Functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Resize handler for responsive charts
window.addEventListener('resize', debounce(() => {
    if (stabilityChart) stabilityChart.resize();
    if (velocityChart) velocityChart.resize();
    if (cveChart) cveChart.resize();
}, 250));

// Export for potential external use
window.MomentumDashboard = {
    charts: {
        stability: stabilityChart,
        velocity: velocityChart,
        cve: cveChart
    },
    updateChartsForPeriod,
    colors
};