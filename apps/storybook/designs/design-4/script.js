// Dashboard Script - Gradient Theme
class MomentumDashboard {
    constructor() {
        this.charts = {};
        this.currentDateRange = 30;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.loadData();
        this.setupResponsiveHandlers();
    }

    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Date range selector
        this.setupDateRangeSelector();
        
        // Chart controls
        this.setupChartControls();
        
        // Mobile menu toggle
        this.setupMobileMenu();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all nav items
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active class to clicked item
                link.closest('.nav-item').classList.add('active');
                
                // Update page title based on selected page
                const page = link.dataset.page;
                this.updatePageTitle(page);
            });
        });
    }

    setupDateRangeSelector() {
        const dateRangeBtn = document.getElementById('dateRangeBtn');
        const dateRangeDropdown = document.getElementById('dateRangeDropdown');
        const dropdownItems = document.querySelectorAll('.dropdown-item');

        // Toggle dropdown
        dateRangeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dateRangeDropdown.classList.toggle('show');
            
            // Rotate arrow
            const arrow = dateRangeBtn.querySelector('.dropdown-arrow');
            arrow.style.transform = dateRangeDropdown.classList.contains('show') 
                ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        // Handle dropdown item selection
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (item.dataset.range === 'custom') {
                    this.showCustomDatePicker();
                    return;
                }
                
                // Remove active class from all items
                dropdownItems.forEach(i => i.classList.remove('active'));
                
                // Add active class to selected item
                item.classList.add('active');
                
                // Update button text
                const dateText = dateRangeBtn.querySelector('.date-text');
                dateText.textContent = item.textContent;
                
                // Update current date range
                this.currentDateRange = parseInt(item.dataset.range) || 30;
                
                // Close dropdown
                dateRangeDropdown.classList.remove('show');
                dateRangeBtn.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
                
                // Refresh data
                this.loadData();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dateRangeDropdown.classList.remove('show');
            dateRangeBtn.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
        });
    }

    setupChartControls() {
        const chartControlBtns = document.querySelectorAll('.chart-control-btn');
        chartControlBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                chartControlBtns.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Update main chart
                const chartType = btn.dataset.chart;
                this.updateMainChart(chartType);
            });
        });
    }

    setupMobileMenu() {
        // Add mobile menu toggle button if needed
        const header = document.querySelector('.header');
        const sidebar = document.querySelector('.sidebar');
        
        // Create mobile menu button
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '☰';
        mobileMenuBtn.style.display = 'none';
        
        // Add to header
        header.appendChild(mobileMenuBtn);
        
        // Toggle sidebar on mobile
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    setupResponsiveHandlers() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        this.handleResize(); // Initial call
    }

    handleResize() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        
        if (window.innerWidth <= 768) {
            mobileMenuBtn.style.display = 'block';
        } else {
            mobileMenuBtn.style.display = 'none';
            document.querySelector('.sidebar').classList.remove('open');
        }
        
        // Resize charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }

    initializeCharts() {
        this.initMetricCharts();
        this.initMainChart();
        this.initTeamChart();
        this.initSecurityChart();
    }

    initMetricCharts() {
        // CVE Chart (Sparkline)
        const cveCtx = document.getElementById('cveChart');
        if (cveCtx) {
            this.charts.cve = new Chart(cveCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 30}, (_, i) => i + 1),
                    datasets: [{
                        data: this.generateSparklineData(30, 15, 35),
                        borderColor: '#fa709a',
                        backgroundColor: 'rgba(250, 112, 154, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }]
                },
                options: this.getSparklineOptions()
            });
        }

        // Stability Chart (Sparkline)
        const stabilityCtx = document.getElementById('stabilityChart');
        if (stabilityCtx) {
            this.charts.stability = new Chart(stabilityCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 30}, (_, i) => i + 1),
                    datasets: [{
                        data: this.generateSparklineData(30, 85, 98),
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }]
                },
                options: this.getSparklineOptions()
            });
        }

        // Velocity Chart (Sparkline)
        const velocityCtx = document.getElementById('velocityChart');
        if (velocityCtx) {
            this.charts.velocity = new Chart(velocityCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 30}, (_, i) => i + 1),
                    datasets: [{
                        data: this.generateSparklineData(30, 1.8, 3.2),
                        borderColor: '#43e97b',
                        backgroundColor: 'rgba(67, 233, 123, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }]
                },
                options: this.getSparklineOptions()
            });
        }

        // Performance Chart (Sparkline)
        const performanceCtx = document.getElementById('performanceChart');
        if (performanceCtx) {
            this.charts.performance = new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 30}, (_, i) => i + 1),
                    datasets: [{
                        data: this.generateSparklineData(30, 0.8, 1.8),
                        borderColor: '#89f7fe',
                        backgroundColor: 'rgba(137, 247, 254, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }]
                },
                options: this.getSparklineOptions()
            });
        }
    }

    initMainChart() {
        const mainCtx = document.getElementById('mainChart');
        if (mainCtx) {
            this.charts.main = new Chart(mainCtx, {
                type: 'line',
                data: {
                    labels: this.generateDateLabels(this.currentDateRange),
                    datasets: [{
                        label: 'Commits',
                        data: this.generateMainChartData('commits'),
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
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
                            backgroundColor: 'rgba(45, 55, 72, 0.95)',
                            titleColor: '#ffffff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: false,
                            callbacks: {
                                title: (context) => {
                                    return `Date: ${context[0].label}`;
                                },
                                label: (context) => {
                                    return `Commits: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#718096',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            display: true,
                            grid: {
                                color: 'rgba(226, 232, 240, 0.5)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#718096',
                                font: {
                                    size: 12
                                }
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
    }

    initTeamChart() {
        const teamCtx = document.getElementById('teamChart');
        if (teamCtx) {
            this.charts.team = new Chart(teamCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Frontend', 'Backend', 'DevOps'],
                    datasets: [{
                        data: [45, 35, 20],
                        backgroundColor: [
                            '#667eea',
                            '#f093fb',
                            '#4facfe'
                        ],
                        borderWidth: 0,
                        hoverOffset: 8
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
                            backgroundColor: 'rgba(45, 55, 72, 0.95)',
                            titleColor: '#ffffff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                label: (context) => {
                                    return `${context.label}: ${context.parsed}%`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }
    }

    initSecurityChart() {
        const securityCtx = document.getElementById('securityChart');
        if (securityCtx) {
            this.charts.security = new Chart(securityCtx, {
                type: 'bar',
                data: {
                    labels: ['Critical', 'High', 'Medium', 'Low'],
                    datasets: [{
                        label: 'Vulnerabilities',
                        data: [3, 8, 12, 5],
                        backgroundColor: [
                            '#dc2626',
                            '#f59e0b',
                            '#10b981',
                            '#3b82f6'
                        ],
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
                            backgroundColor: 'rgba(45, 55, 72, 0.95)',
                            titleColor: '#ffffff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                title: (context) => {
                                    return `${context[0].label} Severity`;
                                },
                                label: (context) => {
                                    return `Count: ${context.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#718096',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            display: true,
                            grid: {
                                color: 'rgba(226, 232, 240, 0.5)',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#718096',
                                font: {
                                    size: 12
                                },
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }
    }

    getSparklineOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        };
    }

    generateSparklineData(count, min, max) {
        const data = [];
        let lastValue = (min + max) / 2;
        
        for (let i = 0; i < count; i++) {
            const variation = (Math.random() - 0.5) * (max - min) * 0.3;
            lastValue = Math.max(min, Math.min(max, lastValue + variation));
            data.push(Number(lastValue.toFixed(2)));
        }
        
        return data;
    }

    generateDateLabels(days) {
        const labels = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            if (days <= 7) {
                labels.push(date.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                }));
            } else if (days <= 30) {
                labels.push(date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                }));
            } else {
                labels.push(date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: '2-digit' 
                }));
            }
        }
        
        return labels;
    }

    generateMainChartData(type) {
        const baseData = {
            commits: { min: 5, max: 25, trend: 'up' },
            deployments: { min: 2, max: 8, trend: 'stable' },
            issues: { min: 10, max: 40, trend: 'down' }
        };
        
        const config = baseData[type] || baseData.commits;
        const data = [];
        let lastValue = (config.min + config.max) / 2;
        
        for (let i = 0; i < this.currentDateRange; i++) {
            let variation = (Math.random() - 0.5) * (config.max - config.min) * 0.4;
            
            // Apply trend
            if (config.trend === 'up') {
                variation += (config.max - config.min) * 0.02;
            } else if (config.trend === 'down') {
                variation -= (config.max - config.min) * 0.02;
            }
            
            lastValue = Math.max(config.min, Math.min(config.max, lastValue + variation));
            data.push(Math.round(lastValue));
        }
        
        return data;
    }

    updateMainChart(type) {
        if (!this.charts.main) return;
        
        const colorMap = {
            commits: { border: '#667eea', bg: 'rgba(102, 126, 234, 0.1)' },
            deployments: { border: '#4facfe', bg: 'rgba(79, 172, 254, 0.1)' },
            issues: { border: '#fa709a', bg: 'rgba(250, 112, 154, 0.1)' }
        };
        
        const colors = colorMap[type] || colorMap.commits;
        
        this.charts.main.data.datasets[0].label = type.charAt(0).toUpperCase() + type.slice(1);
        this.charts.main.data.datasets[0].data = this.generateMainChartData(type);
        this.charts.main.data.datasets[0].borderColor = colors.border;
        this.charts.main.data.datasets[0].backgroundColor = colors.bg;
        this.charts.main.data.datasets[0].pointBackgroundColor = colors.border;
        
        this.charts.main.update('active');
    }

    updatePageTitle(page) {
        const titles = {
            dashboard: 'Dashboard Overview',
            organization: 'Organization Metrics',
            teams: 'Team Performance',
            contributors: 'Contributor Analytics'
        };
        
        const subtitles = {
            dashboard: 'Monitor your development metrics and team performance',
            organization: 'Organization-wide insights and analytics',
            teams: 'Team productivity and collaboration metrics',
            contributors: 'Individual contributor performance tracking'
        };
        
        document.querySelector('.page-title').textContent = titles[page] || titles.dashboard;
        document.querySelector('.page-subtitle').textContent = subtitles[page] || subtitles.dashboard;
    }

    showCustomDatePicker() {
        // For demo purposes, just show an alert
        // In a real implementation, you would show a proper date picker modal
        alert('Custom date picker would be implemented here');
    }

    loadData() {
        // Simulate data loading
        this.showLoadingState();
        
        setTimeout(() => {
            this.updateMetricValues();
            this.refreshCharts();
            this.hideLoadingState();
        }, 500);
    }

    updateMetricValues() {
        // Update metric values based on current date range
        const metrics = {
            30: { cve: 23, stability: 94.2, velocity: 2.4, performance: 1.2 },
            7: { cve: 18, stability: 96.1, velocity: 2.8, performance: 1.1 },
            90: { cve: 31, stability: 92.8, velocity: 2.1, performance: 1.3 },
            365: { cve: 187, stability: 89.4, velocity: 1.9, performance: 1.4 }
        };
        
        const currentMetrics = metrics[this.currentDateRange] || metrics[30];
        
        // Update metric cards
        document.querySelector('.cve-card .metric-value').textContent = currentMetrics.cve;
        document.querySelector('.stability-card .metric-value').textContent = `${currentMetrics.stability}%`;
        document.querySelector('.velocity-card .metric-value').textContent = `${currentMetrics.velocity}x`;
        document.querySelector('.performance-card .metric-value').textContent = `${currentMetrics.performance}s`;
    }

    refreshCharts() {
        // Update main chart with new date range
        if (this.charts.main) {
            this.charts.main.data.labels = this.generateDateLabels(this.currentDateRange);
            this.charts.main.data.datasets[0].data = this.generateMainChartData('commits');
            this.charts.main.update('active');
        }
        
        // Update sparkline charts
        ['cve', 'stability', 'velocity', 'performance'].forEach(chartName => {
            if (this.charts[chartName]) {
                this.charts[chartName].data.labels = Array.from({length: this.currentDateRange}, (_, i) => i + 1);
                this.charts[chartName].data.datasets[0].data = this.generateSparklineData(
                    this.currentDateRange,
                    chartName === 'stability' ? 85 : chartName === 'cve' ? 15 : chartName === 'velocity' ? 1.8 : 0.8,
                    chartName === 'stability' ? 98 : chartName === 'cve' ? 35 : chartName === 'velocity' ? 3.2 : 1.8
                );
                this.charts[chartName].update('none');
            }
        });
    }

    showLoadingState() {
        // Add loading indicators
        document.querySelectorAll('.metric-card').forEach(card => {
            card.style.opacity = '0.6';
        });
        
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.opacity = '0.6';
        });
    }

    hideLoadingState() {
        // Remove loading indicators
        document.querySelectorAll('.metric-card').forEach(card => {
            card.style.opacity = '1';
        });
        
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.opacity = '1';
        });
    }

    // Public methods for external access
    setDateRange(days) {
        this.currentDateRange = days;
        this.loadData();
    }

    refreshData() {
        this.loadData();
    }

    exportData(format = 'json') {
        // Implementation for data export
        console.log(`Exporting data in ${format} format...`);
    }
}

// Animation utilities
class AnimationUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    }
    
    static slideIn(element, direction = 'left', duration = 300) {
        const transforms = {
            left: 'translateX(-100%)',
            right: 'translateX(100%)',
            up: 'translateY(-100%)',
            down: 'translateY(100%)'
        };
        
        element.style.transform = transforms[direction];
        element.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        
        requestAnimationFrame(() => {
            element.style.transform = 'translate(0, 0)';
        });
    }
    
    static pulse(element, scale = 1.05, duration = 200) {
        const originalTransform = element.style.transform;
        element.style.transition = `transform ${duration}ms ease-in-out`;
        element.style.transform = `scale(${scale})`;
        
        setTimeout(() => {
            element.style.transform = originalTransform;
        }, duration);
    }
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(date, format = 'short') {
    const options = {
        short: { month: 'short', day: 'numeric' },
        long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' }
    };
    
    return date.toLocaleDateString('en-US', options[format] || options.short);
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

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global dashboard instance
    window.dashboard = new MomentumDashboard();
    
    // Add some entrance animations
    const animateElements = document.querySelectorAll('.metric-card, .chart-container, .activity-container');
    animateElements.forEach((element, index) => {
        setTimeout(() => {
            AnimationUtils.fadeIn(element);
            AnimationUtils.slideIn(element, 'up');
        }, index * 100);
    });
    
    // Add hover effects to interactive elements
    document.querySelectorAll('.metric-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            AnimationUtils.pulse(card, 1.02, 150);
        });
    });
    
    console.log('🚀 Momentum Dashboard initialized successfully!');
});

// Add some demo real-time updates
setInterval(() => {
    if (window.dashboard && Math.random() > 0.7) {
        // Simulate real-time activity updates
        const activities = document.querySelectorAll('.activity-item');
        if (activities.length > 0) {
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            AnimationUtils.pulse(randomActivity, 1.02, 200);
        }
    }
}, 5000);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'r':
                e.preventDefault();
                if (window.dashboard) {
                    window.dashboard.refreshData();
                }
                break;
            case 'e':
                e.preventDefault();
                if (window.dashboard) {
                    window.dashboard.exportData();
                }
                break;
        }
    }
});