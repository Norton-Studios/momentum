// Dashboard JavaScript with Chart.js Integration
class MomentumDashboard {
    constructor() {
        this.charts = {};
        this.currentDateRange = '30d';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Date range selector
        const dateRangeSelector = document.getElementById('dateRange');
        if (dateRangeSelector) {
            dateRangeSelector.addEventListener('change', (e) => {
                this.currentDateRange = e.target.value;
                this.updateAllCharts();
                this.updateMetrics();
            });
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(link);
            });
        });

        // Chart control buttons
        const chartButtons = document.querySelectorAll('.chart-btn');
        chartButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleChartToggle(e.target);
            });
        });

        // Responsive sidebar toggle for mobile
        this.setupMobileNavigation();
    }

    handleNavigation(activeLink) {
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        activeLink.parentElement.classList.add('active');

        // Add loading animation
        this.showLoadingState();
        
        // Simulate navigation delay
        setTimeout(() => {
            this.hideLoadingState();
        }, 800);
    }

    handleChartToggle(button) {
        // Update active button state
        const container = button.closest('.chart-container');
        container.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Update chart based on selection
        const chartType = button.dataset.chart;
        const chartCanvas = container.querySelector('canvas');
        if (chartCanvas) {
            this.updateChart(chartCanvas.id, chartType);
        }
    }

    initializeCharts() {
        this.createDeploymentChart();
        this.createLeadTimeChart();
        this.createTeamPerformanceChart();
    }

    createDeploymentChart() {
        const ctx = document.getElementById('deploymentChart');
        if (!ctx) return;

        const data = this.getDeploymentData();
        
        this.charts.deployment = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Deployments',
                    data: data.deployments,
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4facfe',
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return `${context[0].label}`;
                            },
                            label: function(context) {
                                return `${context.parsed.y} deployments`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#4facfe'
                    }
                }
            }
        });
    }

    createLeadTimeChart() {
        const ctx = document.getElementById('leadTimeChart');
        if (!ctx) return;

        const data = this.getLeadTimeData();
        
        this.charts.leadTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Lead Time (hours)',
                    data: data.leadTimes,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: '#10b981',
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
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} hours`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    createTeamPerformanceChart() {
        const ctx = document.getElementById('teamPerformanceChart');
        if (!ctx) return;

        const data = this.getTeamPerformanceData();
        
        this.charts.teamPerformance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Team Alpha',
                    data: data.teamAlpha,
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#4facfe',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }, {
                    label: 'Team Beta',
                    data: data.teamBeta,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }, {
                    label: 'Team Gamma',
                    data: data.teamGamma,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#f59e0b',
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
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            backdropColor: 'transparent'
                        }
                    }
                }
            }
        });
    }

    // Data generation methods
    getDeploymentData() {
        const labels = [];
        const deployments = [];
        
        // Generate data based on current date range
        const days = this.getDaysFromRange(this.currentDateRange);
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            // Generate realistic deployment data with some randomness
            const baseValue = Math.floor(Math.random() * 5) + 1;
            const variation = Math.floor(Math.random() * 3);
            deployments.push(baseValue + variation);
        }
        
        return { labels, deployments };
    }

    getLeadTimeData() {
        const labels = ['Frontend', 'Backend', 'DevOps', 'Mobile', 'Data'];
        const leadTimes = [12.5, 8.3, 15.7, 11.2, 9.8];
        
        return { labels, leadTimes };
    }

    getTeamPerformanceData() {
        const labels = ['Velocity', 'Quality', 'Stability', 'Collaboration', 'Innovation'];
        
        return {
            labels,
            teamAlpha: [85, 92, 78, 90, 82],
            teamBeta: [78, 88, 85, 85, 90],
            teamGamma: [92, 85, 90, 82, 78]
        };
    }

    getDaysFromRange(range) {
        switch (range) {
            case '7d': return 7;
            case '30d': return 30;
            case '90d': return 90;
            case '1y': return 365;
            default: return 30;
        }
    }

    updateChart(chartId, chartType) {
        // Add loading state
        const container = document.querySelector(`#${chartId}`).closest('.chart-container');
        container.classList.add('loading');
        
        // Simulate data loading
        setTimeout(() => {
            // Update chart with new data based on type
            if (chartId === 'deploymentChart') {
                this.updateDeploymentChart(chartType);
            } else if (chartId === 'leadTimeChart') {
                this.updateLeadTimeChart(chartType);
            } else if (chartId === 'teamPerformanceChart') {
                this.updateTeamPerformanceChart(chartType);
            }
            
            container.classList.remove('loading');
        }, 500);
    }

    updateDeploymentChart(type) {
        const chart = this.charts.deployment;
        if (!chart) return;

        if (type === 'rollbacks') {
            // Update to show rollback data
            chart.data.datasets[0].label = 'Rollbacks';
            chart.data.datasets[0].data = [1, 0, 2, 0, 1, 0, 1, 3, 0, 1, 0, 0, 2, 1];
            chart.data.datasets[0].borderColor = '#ef4444';
            chart.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)';
            chart.data.datasets[0].pointBackgroundColor = '#ef4444';
        } else {
            // Reset to deployment data
            const data = this.getDeploymentData();
            chart.data.datasets[0].label = 'Deployments';
            chart.data.datasets[0].data = data.deployments;
            chart.data.datasets[0].borderColor = '#4facfe';
            chart.data.datasets[0].backgroundColor = 'rgba(79, 172, 254, 0.1)';
            chart.data.datasets[0].pointBackgroundColor = '#4facfe';
        }
        
        chart.update();
    }

    updateLeadTimeChart(type) {
        const chart = this.charts.leadTime;
        if (!chart) return;

        if (type === 'p95') {
            // Update to show 95th percentile data
            chart.data.datasets[0].label = '95th Percentile (hours)';
            chart.data.datasets[0].data = [18.2, 14.7, 22.1, 16.8, 15.3];
            chart.data.datasets[0].backgroundColor = 'rgba(245, 158, 11, 0.6)';
            chart.data.datasets[0].borderColor = '#f59e0b';
        } else {
            // Reset to average data
            const data = this.getLeadTimeData();
            chart.data.datasets[0].label = 'Lead Time (hours)';
            chart.data.datasets[0].data = data.leadTimes;
            chart.data.datasets[0].backgroundColor = 'rgba(16, 185, 129, 0.6)';
            chart.data.datasets[0].borderColor = '#10b981';
        }
        
        chart.update();
    }

    updateTeamPerformanceChart(type) {
        const chart = this.charts.teamPerformance;
        if (!chart) return;

        const data = this.getTeamPerformanceData();
        
        if (type === 'quality') {
            // Focus on quality metrics
            chart.data.labels = ['Code Coverage', 'Bug Rate', 'Tech Debt', 'Review Quality', 'Testing'];
            chart.data.datasets[0].data = [92, 85, 78, 90, 88];
            chart.data.datasets[1].data = [88, 90, 82, 85, 92];
            chart.data.datasets[2].data = [85, 88, 85, 82, 90];
        } else if (type === 'stability') {
            // Focus on stability metrics
            chart.data.labels = ['Uptime', 'Error Rate', 'Recovery Time', 'Monitoring', 'Alerts'];
            chart.data.datasets[0].data = [98, 92, 85, 88, 90];
            chart.data.datasets[1].data = [95, 88, 90, 92, 85];
            chart.data.datasets[2].data = [97, 90, 88, 85, 92];
        } else {
            // Reset to velocity data
            chart.data.labels = data.labels;
            chart.data.datasets[0].data = data.teamAlpha;
            chart.data.datasets[1].data = data.teamBeta;
            chart.data.datasets[2].data = data.teamGamma;
        }
        
        chart.update();
    }

    updateAllCharts() {
        // Update all charts when date range changes
        Object.keys(this.charts).forEach(chartKey => {
            if (chartKey === 'deployment') {
                const newData = this.getDeploymentData();
                this.charts[chartKey].data.labels = newData.labels;
                this.charts[chartKey].data.datasets[0].data = newData.deployments;
                this.charts[chartKey].update();
            }
        });
    }

    updateMetrics() {
        // Simulate metric updates based on date range
        const metrics = this.generateMetrics();
        
        // Update CVE count
        const cveElement = document.querySelector('.metric-card:nth-child(1) .number');
        if (cveElement) {
            this.animateNumber(cveElement, parseInt(cveElement.textContent), metrics.cve);
        }
        
        // Update Pipeline Stability
        const stabilityElement = document.querySelector('.metric-card:nth-child(2) .number');
        if (stabilityElement) {
            this.animateNumber(stabilityElement, parseFloat(stabilityElement.textContent), metrics.stability, '%');
        }
        
        // Update Delivery Velocity
        const velocityElement = document.querySelector('.metric-card:nth-child(3) .number');
        if (velocityElement) {
            this.animateNumber(velocityElement, parseFloat(velocityElement.textContent), metrics.velocity);
        }
    }

    generateMetrics() {
        // Generate metrics based on current date range
        const baseMetrics = {
            '7d': { cve: 8, stability: 96.1, velocity: 9.2 },
            '30d': { cve: 12, stability: 94.2, velocity: 8.3 },
            '90d': { cve: 28, stability: 92.8, velocity: 7.9 },
            '1y': { cve: 95, stability: 91.5, velocity: 8.1 }
        };
        
        return baseMetrics[this.currentDateRange] || baseMetrics['30d'];
    }

    animateNumber(element, from, to, suffix = '') {
        const duration = 1000;
        const steps = 60;
        const stepValue = (to - from) / steps;
        let current = from;
        let step = 0;
        
        const timer = setInterval(() => {
            current += stepValue;
            step++;
            
            if (suffix === '%') {
                element.textContent = current.toFixed(1) + suffix;
            } else {
                element.textContent = Math.round(current) + suffix;
            }
            
            if (step >= steps) {
                clearInterval(timer);
                if (suffix === '%') {
                    element.textContent = to.toFixed(1) + suffix;
                } else {
                    element.textContent = Math.round(to) + suffix;
                }
            }
        }, duration / steps);
    }

    showLoadingState() {
        const mainContent = document.querySelector('.main-content');
        mainContent.style.opacity = '0.7';
        mainContent.style.pointerEvents = 'none';
    }

    hideLoadingState() {
        const mainContent = document.querySelector('.main-content');
        mainContent.style.opacity = '1';
        mainContent.style.pointerEvents = 'auto';
    }

    setupMobileNavigation() {
        // Add mobile menu toggle if needed
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');
            
            // Create mobile menu button
            const menuButton = document.createElement('button');
            menuButton.className = 'mobile-menu-toggle';
            menuButton.innerHTML = '<i class="fas fa-bars"></i>';
            menuButton.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 1000;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: white;
                padding: 10px;
                cursor: pointer;
                backdrop-filter: blur(10px);
            `;
            
            document.body.appendChild(menuButton);
            
            menuButton.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
    }

    startRealTimeUpdates() {
        // Simulate real-time updates every 30 seconds
        setInterval(() => {
            this.updateActivityFeed();
        }, 30000);
    }

    updateActivityFeed() {
        const activities = [
            {
                icon: 'fas fa-code-branch',
                text: '<strong>Emma Wilson</strong> merged pull request #251',
                time: 'Just now'
            },
            {
                icon: 'fas fa-rocket',
                text: 'Staging deployment completed successfully',
                time: '1 minute ago'
            },
            {
                icon: 'fas fa-bug',
                text: '<strong>Alex Chen</strong> resolved security vulnerability',
                time: '5 minutes ago'
            }
        ];
        
        const activityList = document.querySelector('.activity-list');
        if (activityList && Math.random() > 0.7) {
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="${randomActivity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p>${randomActivity.text}</p>
                    <span class="activity-time">${randomActivity.time}</span>
                </div>
            `;
            
            // Add with animation
            activityItem.style.opacity = '0';
            activityItem.style.transform = 'translateY(20px)';
            activityList.insertBefore(activityItem, activityList.firstChild);
            
            setTimeout(() => {
                activityItem.style.transition = 'all 0.3s ease';
                activityItem.style.opacity = '1';
                activityItem.style.transform = 'translateY(0)';
            }, 100);
            
            // Remove old items if too many
            const items = activityList.querySelectorAll('.activity-item');
            if (items.length > 5) {
                items[items.length - 1].remove();
            }
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MomentumDashboard();
});

// Handle window resize for responsive charts
window.addEventListener('resize', () => {
    Object.values(window.dashboard?.charts || {}).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            chart.resize();
        }
    });
});

// Export for global access
window.MomentumDashboard = MomentumDashboard;