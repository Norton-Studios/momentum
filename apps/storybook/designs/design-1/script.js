// Momentum Dashboard - Modern Dark Theme with Neon Accents
// Chart.js integration for metrics visualization

// Chart configuration defaults
Chart.defaults.color = '#b0b0b0';
Chart.defaults.borderColor = '#333333';
Chart.defaults.backgroundColor = 'rgba(0, 255, 255, 0.1)';

// Color palette for charts
const chartColors = {
    primary: '#00ffff',
    secondary: '#8b5cf6',
    accent: '#00ff88',
    warning: '#ff6600',
    danger: '#ff0080',
    gradient: {
        cyan: 'rgba(0, 255, 255, 0.8)',
        purple: 'rgba(139, 92, 246, 0.8)',
        green: 'rgba(0, 255, 136, 0.8)',
        pink: 'rgba(255, 0, 128, 0.8)',
        orange: 'rgba(255, 102, 0, 0.8)'
    }
};

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    initializeInteractions();
});

function initializeCharts() {
    // Commit Activity Heatmap
    initializeHeatmapChart();
    
    // Merge Request Metrics Chart
    initializeMergeRequestChart();
    
    // Team Performance Chart
    initializeTeamPerformanceChart();
}

function initializeHeatmapChart() {
    const ctx = document.getElementById('heatmapChart');
    if (!ctx) return;

    // Generate sample heatmap data for the last 7 days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({length: 24}, (_, i) => i);
    
    const heatmapData = [];
    days.forEach((day, dayIndex) => {
        hours.forEach(hour => {
            // Generate realistic commit activity (more during work hours)
            let intensity = 0;
            if (dayIndex < 5) { // Weekdays
                if (hour >= 9 && hour <= 17) {
                    intensity = Math.random() * 50 + 10; // Higher activity during work hours
                } else {
                    intensity = Math.random() * 10; // Lower activity outside work hours
                }
            } else { // Weekends
                intensity = Math.random() * 15;
            }
            
            heatmapData.push({
                x: hour,
                y: dayIndex,
                v: Math.round(intensity)
            });
        });
    });

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Commit Activity',
                data: heatmapData,
                backgroundColor: function(context) {
                    const value = context.parsed.v;
                    const alpha = Math.min(value / 50, 1);
                    return `rgba(0, 255, 255, ${alpha})`;
                },
                borderColor: chartColors.primary,
                borderWidth: 1,
                pointRadius: function(context) {
                    return Math.max(3, context.parsed.v / 10);
                }
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
                    callbacks: {
                        title: function(context) {
                            const point = context[0];
                            return `${days[point.parsed.y]} ${point.parsed.x}:00`;
                        },
                        label: function(context) {
                            return `${context.parsed.v} commits`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 23,
                    ticks: {
                        stepSize: 2,
                        callback: function(value) {
                            return value + ':00';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Hour of Day'
                    }
                },
                y: {
                    type: 'linear',
                    min: -0.5,
                    max: 6.5,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return days[value] || '';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Day of Week'
                    }
                }
            }
        }
    });
}

function initializeMergeRequestChart() {
    const ctx = document.getElementById('mergeRequestChart');
    if (!ctx) return;

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, chartColors.gradient.cyan);
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Opened',
                data: [23, 31, 28, 35],
                borderColor: chartColors.primary,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#0a0a0a',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }, {
                label: 'Merged',
                data: [18, 24, 22, 29],
                borderColor: chartColors.accent,
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                fill: false,
                tension: 0.4,
                pointBackgroundColor: chartColors.accent,
                pointBorderColor: '#0a0a0a',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }, {
                label: 'Closed',
                data: [5, 7, 6, 6],
                borderColor: chartColors.danger,
                backgroundColor: 'rgba(255, 0, 128, 0.1)',
                fill: false,
                tension: 0.4,
                pointBackgroundColor: chartColors.danger,
                pointBorderColor: '#0a0a0a',
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
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#333333'
                    }
                },
                x: {
                    grid: {
                        color: '#333333'
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

function initializeTeamPerformanceChart() {
    const ctx = document.getElementById('teamPerformanceChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Code Quality', 'Velocity', 'Reliability', 'Security', 'Innovation', 'Collaboration'],
            datasets: [{
                label: 'Frontend Team',
                data: [85, 92, 78, 88, 94, 89],
                borderColor: chartColors.primary,
                backgroundColor: 'rgba(0, 255, 255, 0.2)',
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#0a0a0a',
                pointBorderWidth: 2
            }, {
                label: 'Backend Team',
                data: [92, 87, 95, 91, 82, 86],
                borderColor: chartColors.secondary,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                pointBackgroundColor: chartColors.secondary,
                pointBorderColor: '#0a0a0a',
                pointBorderWidth: 2
            }, {
                label: 'DevOps Team',
                data: [88, 85, 98, 95, 87, 91],
                borderColor: chartColors.accent,
                backgroundColor: 'rgba(0, 255, 136, 0.2)',
                pointBackgroundColor: chartColors.accent,
                pointBorderColor: '#0a0a0a',
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
                        usePointStyle: true,
                        padding: 15
                    }
                }
            },
            scales: {
                r: {
                    angleLines: {
                        color: '#333333'
                    },
                    grid: {
                        color: '#333333'
                    },
                    pointLabels: {
                        color: '#b0b0b0',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        color: '#707070',
                        backdropColor: 'transparent'
                    },
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

function initializeInteractions() {
    // Date range selector
    const dateButtons = document.querySelectorAll('.date-btn');
    dateButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            dateButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const range = this.dataset.range;
            if (range === 'custom') {
                showCustomDatePicker();
            } else {
                updateChartsForDateRange(range);
            }
        });
    });

    // Navigation menu interactions
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const link = item.querySelector('.nav-link');
        if (link && item.classList.contains('has-submenu')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                item.classList.toggle('active');
            });
        }
    });

    // Chart control buttons
    const controlButtons = document.querySelectorAll('.control-btn');
    controlButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const container = this.closest('.chart-container');
            const buttons = container.querySelectorAll('.control-btn');
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update chart based on selection
            updateHeatmapView(this.textContent.toLowerCase());
        });
    });

    // Metric cards hover effects
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Activity items interaction
    const activityItems = document.querySelectorAll('.activity-item');
    activityItems.forEach(item => {
        item.addEventListener('click', function() {
            // Add click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
}

function showCustomDatePicker() {
    // Create a simple custom date range picker
    const modal = document.createElement('div');
    modal.className = 'date-picker-modal';
    modal.innerHTML = `
        <div class="date-picker-content">
            <h3>Select Date Range</h3>
            <div class="date-inputs">
                <div class="input-group">
                    <label>From:</label>
                    <input type="date" id="startDate" />
                </div>
                <div class="input-group">
                    <label>To:</label>
                    <input type="date" id="endDate" />
                </div>
            </div>
            <div class="date-picker-actions">
                <button class="cancel-btn">Cancel</button>
                <button class="apply-btn">Apply</button>
            </div>
        </div>
    `;
    
    // Add modal styles
    const modalStyles = document.createElement('style');
    modalStyles.textContent = `
        .date-picker-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .date-picker-content {
            background: var(--bg-secondary);
            padding: 2rem;
            border-radius: 16px;
            border: 1px solid var(--border-color);
            min-width: 300px;
        }
        .date-picker-content h3 {
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        }
        .date-inputs {
            margin-bottom: 1.5rem;
        }
        .input-group {
            margin-bottom: 1rem;
        }
        .input-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
        }
        .input-group input {
            width: 100%;
            padding: 0.75rem;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
        }
        .date-picker-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
        }
        .date-picker-actions button {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: var(--transition);
        }
        .cancel-btn {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
        }
        .apply-btn {
            background: var(--neon-cyan);
            color: var(--bg-primary);
        }
    `;
    
    document.head.appendChild(modalStyles);
    document.body.appendChild(modal);
    
    // Handle modal actions
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(modalStyles);
        // Reset to previous active date button
        document.querySelector('.date-btn[data-range="30"]').classList.add('active');
        document.querySelector('.date-btn[data-range="custom"]').classList.remove('active');
    });
    
    modal.querySelector('.apply-btn').addEventListener('click', () => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            updateChartsForCustomRange(startDate, endDate);
        }
        
        document.body.removeChild(modal);
        document.head.removeChild(modalStyles);
    });
}

function updateChartsForDateRange(days) {
    console.log(`Updating charts for ${days} days range`);
    // Simulate data refresh with loading animation
    showLoadingState();
    
    setTimeout(() => {
        // Here you would typically fetch new data from your API
        // For demo purposes, we'll just refresh the charts with new sample data
        refreshChartsWithNewData(days);
        hideLoadingState();
    }, 1000);
}

function updateChartsForCustomRange(startDate, endDate) {
    console.log(`Updating charts for custom range: ${startDate} to ${endDate}`);
    updateChartsForDateRange('custom');
}

function updateHeatmapView(view) {
    console.log(`Updating heatmap view to: ${view}`);
    // Here you would update the heatmap chart based on the selected view
}

function showLoadingState() {
    const charts = document.querySelectorAll('canvas');
    charts.forEach(chart => {
        chart.style.opacity = '0.5';
    });
}

function hideLoadingState() {
    const charts = document.querySelectorAll('canvas');
    charts.forEach(chart => {
        chart.style.opacity = '1';
    });
}

function refreshChartsWithNewData(range) {
    // This would typically involve destroying and recreating charts with new data
    // For demo purposes, we'll just log the action
    console.log(`Charts refreshed with data for ${range} days`);
}

// Utility function to generate gradient backgrounds for charts
function createGradient(ctx, colorStart, colorEnd) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

// Animation utility for smooth transitions
function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// Export functions for potential external use
window.MomentumDashboard = {
    updateChartsForDateRange,
    updateHeatmapView,
    animateValue,
    chartColors
};