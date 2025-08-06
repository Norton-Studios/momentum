// Corporate Theme Dashboard JavaScript
class MomentumDashboard {
    constructor() {
        this.charts = {};
        this.currentDateRange = '30';
        this.animationDuration = 300;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showLoadingOverlay();
        
        // Simulate initial data loading
        setTimeout(() => {
            this.initializeCharts();
            this.animateMetricCards();
            this.hideLoadingOverlay();
        }, 1500);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(e.target.closest('.nav-link'));
            });
        });

        // Date range selector
        const dateRangeSelect = document.getElementById('dateRange');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.handleDateRangeChange(e.target.value);
            });
        }

        // Refresh button
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshDashboard();
            });
        }

        // Chart controls
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleChartTypeChange(e.target);
            });
        });

        // Metric cards hover effects
        document.querySelectorAll('.metric-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.animateMetricCard(card, true);
            });
            
            card.addEventListener('mouseleave', () => {
                this.animateMetricCard(card, false);
            });
        });
    }

    handleNavigation(link) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        link.closest('.nav-item').classList.add('active');
        
        // Update page title
        const section = link.dataset.section;
        const title = link.querySelector('span').textContent;
        document.querySelector('.page-title').textContent = title;
        
        // Add smooth transition effect
        this.addPageTransition();
    }

    addPageTransition() {
        const content = document.querySelector('.dashboard-content');
        content.style.opacity = '0.7';
        content.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 150);
    }

    handleDateRangeChange(value) {
        this.currentDateRange = value;
        this.showLoadingOverlay();
        
        // Simulate data refresh
        setTimeout(() => {
            this.updateMetrics();
            this.updateCharts();
            this.hideLoadingOverlay();
        }, 800);
    }

    refreshDashboard() {
        const refreshBtn = document.querySelector('.refresh-btn i');
        refreshBtn.style.animation = 'spin 1s linear infinite';
        
        this.showLoadingOverlay();
        
        setTimeout(() => {
            this.updateMetrics();
            this.updateCharts();
            this.hideLoadingOverlay();
            refreshBtn.style.animation = '';
        }, 1200);
    }

    showLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('show');
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('show');
    }

    animateMetricCards() {
        const cards = document.querySelectorAll('.metric-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    animateMetricCard(card, isHover) {
        const icon = card.querySelector('.metric-icon');
        const value = card.querySelector('.value');
        
        if (isHover) {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
            value.style.transform = 'scale(1.05)';
        } else {
            icon.style.transform = 'scale(1) rotate(0deg)';
            value.style.transform = 'scale(1)';
        }
    }

    initializeCharts() {
        this.createVelocityChart();
        this.createPipelineChart();
        this.createSecurityChart();
    }

    createVelocityChart() {
        const ctx = document.getElementById('velocityChart');
        if (!ctx) return;

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');

        this.charts.velocity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getDateLabels(),
                datasets: [{
                    label: 'Velocity (Story Points)',
                    data: this.generateVelocityData(),
                    borderColor: '#3b82f6',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
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
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} story points`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        border: {
                            display: false
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        border: {
                            display: false
                        },
                        grid: {
                            color: 'rgba(107, 114, 128, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    createPipelineChart() {
        const ctx = document.getElementById('pipelineChart');
        if (!ctx) return;

        this.charts.pipeline = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Successful', 'Failed', 'Cancelled'],
                datasets: [{
                    data: [94.2, 4.8, 1.0],
                    backgroundColor: [
                        '#10b981',
                        '#ef4444',
                        '#f59e0b'
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
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: '#6b7280'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    createSecurityChart() {
        const ctx = document.getElementById('securityChart');
        if (!ctx) return;

        this.charts.security = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    label: 'CVE Count',
                    data: [2, 5, 8, 12],
                    backgroundColor: [
                        '#ef4444',
                        '#f59e0b',
                        '#3b82f6',
                        '#10b981'
                    ],
                    borderRadius: 8,
                    borderSkipped: false,
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
                        backgroundColor: 'rgba(17, 24, 39, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y} vulnerabilities`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        border: {
                            display: false
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    y: {
                        border: {
                            display: false
                        },
                        grid: {
                            color: 'rgba(107, 114, 128, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#6b7280',
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            stepSize: 2
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    handleChartTypeChange(button) {
        // Remove active class from all chart buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Update chart based on selected type
        const chartType = button.dataset.chart;
        this.updateVelocityChart(chartType);
    }

    updateVelocityChart(type) {
        if (!this.charts.velocity) return;
        
        let newData, label, color;
        
        switch(type) {
            case 'commits':
                newData = this.generateCommitsData();
                label = 'Commits';
                color = '#10b981';
                break;
            case 'deployments':
                newData = this.generateDeploymentsData();
                label = 'Deployments';
                color = '#f59e0b';
                break;
            default:
                newData = this.generateVelocityData();
                label = 'Velocity (Story Points)';
                color = '#3b82f6';
        }
        
        this.charts.velocity.data.datasets[0].data = newData;
        this.charts.velocity.data.datasets[0].label = label;
        this.charts.velocity.data.datasets[0].borderColor = color;
        this.charts.velocity.data.datasets[0].pointBackgroundColor = color;
        
        this.charts.velocity.update('active');
    }

    updateMetrics() {
        // Simulate metric updates with animations
        this.animateMetricValue('cveCount', this.generateRandomValue(8, 15));
        this.animateMetricValue('pipelineStability', this.generateRandomValue(92, 97, 1) + '%');
        this.animateMetricValue('deliveryVelocity', this.generateRandomValue(7, 10, 1));
        this.animateMetricValue('efficiency', this.generateRandomValue(85, 95) + '%');
    }

    animateMetricValue(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.style.transform = 'scale(1.1)';
        element.style.color = '#3b82f6';
        
        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 150);
    }

    updateCharts() {
        // Update all charts with new data
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                chart.update('active');
            }
        });
    }

    // Data generation helpers
    getDateLabels() {
        const days = parseInt(this.currentDateRange);
        const labels = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            }));
        }
        
        return labels.length > 14 ? 
            labels.filter((_, index) => index % Math.ceil(labels.length / 14) === 0) : 
            labels;
    }

    generateVelocityData() {
        const days = parseInt(this.currentDateRange);
        const points = Math.min(days, 14);
        return Array.from({ length: points }, () => 
            this.generateRandomValue(5, 12, 1)
        );
    }

    generateCommitsData() {
        const days = parseInt(this.currentDateRange);
        const points = Math.min(days, 14);
        return Array.from({ length: points }, () => 
            this.generateRandomValue(15, 45)
        );
    }

    generateDeploymentsData() {
        const days = parseInt(this.currentDateRange);
        const points = Math.min(days, 14);
        return Array.from({ length: points }, () => 
            this.generateRandomValue(1, 8)
        );
    }

    generateRandomValue(min, max, decimals = 0) {
        const value = Math.random() * (max - min) + min;
        return decimals > 0 ? 
            parseFloat(value.toFixed(decimals)) : 
            Math.floor(value);
    }
}

// Utility functions for enhanced interactions
class DashboardAnimations {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = `all ${duration}ms ease-out`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    static slideIn(element, direction = 'left', duration = 300) {
        const transform = direction === 'left' ? 'translateX(-20px)' : 'translateX(20px)';
        element.style.opacity = '0';
        element.style.transform = transform;
        element.style.transition = `all ${duration}ms ease-out`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    }

    static pulse(element, scale = 1.05, duration = 200) {
        element.style.transition = `transform ${duration}ms ease-out`;
        element.style.transform = `scale(${scale})`;
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, duration);
    }
}

// Advanced chart configurations
const ChartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
    },
    plugins: {
        tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#3b82f6',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            titleFont: {
                size: 14,
                weight: '600'
            },
            bodyFont: {
                size: 13,
                weight: '500'
            }
        }
    }
};

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            chartRenderTime: 0,
            dataUpdateTime: 0,
            animationTime: 0
        };
    }

    startTimer(metric) {
        this.metrics[`${metric}Start`] = performance.now();
    }

    endTimer(metric) {
        const start = this.metrics[`${metric}Start`];
        if (start) {
            this.metrics[metric] = performance.now() - start;
            delete this.metrics[`${metric}Start`];
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }
}

// Theme management
class ThemeManager {
    constructor() {
        this.currentTheme = 'corporate';
        this.themes = {
            corporate: {
                primary: '#3b82f6',
                secondary: '#10b981',
                accent: '#f59e0b',
                danger: '#ef4444'
            }
        };
    }

    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(`--accent-${key}`, value);
        });

        this.currentTheme = themeName;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize performance monitoring
    const performanceMonitor = new PerformanceMonitor();
    
    // Initialize theme manager
    const themeManager = new ThemeManager();
    
    // Initialize main dashboard
    const dashboard = new MomentumDashboard();
    
    // Make instances globally available for debugging
    window.dashboard = dashboard;
    window.performanceMonitor = performanceMonitor;
    window.themeManager = themeManager;
    
    // Add global error handling
    window.addEventListener('error', (event) => {
        console.error('Dashboard Error:', event.error);
    });
    
    // Add performance logging
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Dashboard loaded in ${loadTime}ms`);
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + R for refresh
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            dashboard.refreshDashboard();
        }
        
        // Escape to close any modals or overlays
        if (event.key === 'Escape') {
            dashboard.hideLoadingOverlay();
        }
    });
});

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}