// Material Design Dashboard JavaScript
class MomentumDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.charts = {};
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupDateRangeSelector();
        this.initializeCharts();
        this.setupResponsive();
        this.animateMetrics();
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const contentAreas = document.querySelectorAll('.content-area');
        const pageTitle = document.getElementById('page-title');
        const pageSubtitle = document.getElementById('page-subtitle');

        const sectionData = {
            dashboard: {
                title: 'Dashboard',
                subtitle: 'Monitor your development metrics and team performance'
            },
            organization: {
                title: 'Organization',
                subtitle: 'Organization-wide insights and analytics'
            },
            teams: {
                title: 'Teams',
                subtitle: 'Team performance and collaboration metrics'
            },
            contributors: {
                title: 'Contributors',
                subtitle: 'Individual contributor analytics and insights'
            }
        };

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;

                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Show corresponding content
                contentAreas.forEach(content => content.classList.add('hidden'));
                document.getElementById(`${section}-content`).classList.remove('hidden');

                // Update page title
                const data = sectionData[section];
                pageTitle.textContent = data.title;
                pageSubtitle.textContent = data.subtitle;

                this.currentSection = section;

                // Reinitialize charts if switching back to dashboard
                if (section === 'dashboard') {
                    setTimeout(() => this.initializeCharts(), 100);
                }
            });
        });
    }

    setupDateRangeSelector() {
        const dateRangeSelect = document.getElementById('dateRange');
        
        dateRangeSelect.addEventListener('change', (e) => {
            const days = parseInt(e.target.value);
            this.updateMetricsForDateRange(days);
            this.updateChartsForDateRange(days);
        });
    }

    updateMetricsForDateRange(days) {
        // Simulate metric updates based on date range
        const metrics = {
            7: {
                cve: 15,
                cveTrend: '+8%',
                pipeline: 96.1,
                pipelineTrend: '+1.2%',
                velocity: 12.3,
                velocityTrend: '+25%',
                contributors: 28,
                contributorsTrend: '+5'
            },
            30: {
                cve: 23,
                cveTrend: '+12%',
                pipeline: 94.2,
                pipelineTrend: '+2.1%',
                velocity: 8.4,
                velocityTrend: '+15%',
                contributors: 42,
                contributorsTrend: '+3'
            },
            90: {
                cve: 45,
                cveTrend: '+18%',
                pipeline: 92.8,
                pipelineTrend: '-1.5%',
                velocity: 6.7,
                velocityTrend: '+8%',
                contributors: 38,
                contributorsTrend: '-2'
            },
            365: {
                cve: 156,
                cveTrend: '+22%',
                pipeline: 91.5,
                pipelineTrend: '+5.2%',
                velocity: 5.9,
                velocityTrend: '+12%',
                contributors: 45,
                contributorsTrend: '+8'
            }
        };

        const data = metrics[days];
        
        // Update CVE count
        this.animateValue('cve-count', parseInt(document.getElementById('cve-count').textContent), data.cve);
        
        // Update Pipeline Stability
        this.animateValue('pipeline-stability', parseFloat(document.getElementById('pipeline-stability').textContent), data.pipeline, '%');
        
        // Update Delivery Velocity
        this.animateValue('delivery-velocity', parseFloat(document.getElementById('delivery-velocity').textContent), data.velocity);
        
        // Update Active Contributors
        this.animateValue('active-contributors', parseInt(document.getElementById('active-contributors').textContent), data.contributors);
    }

    animateValue(elementId, start, end, suffix = '') {
        const element = document.getElementById(elementId);
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const current = start + (end - start) * easeOut;
            
            if (suffix === '%') {
                element.textContent = current.toFixed(1) + suffix;
            } else if (Number.isInteger(end)) {
                element.textContent = Math.round(current) + suffix;
            } else {
                element.textContent = current.toFixed(1) + suffix;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    animateMetrics() {
        const metricCards = document.querySelectorAll('.metric-card');
        
        metricCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    initializeCharts() {
        this.initVelocityChart();
        this.initPipelineChart();
        this.initSecurityChart();
    }

    initVelocityChart() {
        const ctx = document.getElementById('velocityChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.velocity) {
            this.charts.velocity.destroy();
        }

        const data = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Deployments',
                data: [12, 19, 15, 22],
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Features Released',
                data: [8, 12, 10, 15],
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        this.charts.velocity = new Chart(ctx, {
            type: 'line',
            data: data,
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
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                }
            }
        });
    }

    initPipelineChart() {
        const ctx = document.getElementById('pipelineChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.pipeline) {
            this.charts.pipeline.destroy();
        }

        const data = {
            labels: ['Success', 'Failed', 'Cancelled'],
            datasets: [{
                data: [85, 12, 3],
                backgroundColor: [
                    '#4CAF50',
                    '#F44336',
                    '#FF9800'
                ],
                borderWidth: 0
            }]
        };

        this.charts.pipeline = new Chart(ctx, {
            type: 'doughnut',
            data: data,
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
                cutout: '60%'
            }
        });
    }

    initSecurityChart() {
        const ctx = document.getElementById('securityChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.security) {
            this.charts.security.destroy();
        }

        const data = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Critical',
                data: [5, 3, 8, 4, 6, 2],
                backgroundColor: '#F44336',
                stack: 'vulnerabilities'
            }, {
                label: 'High',
                data: [12, 8, 15, 10, 14, 9],
                backgroundColor: '#FF9800',
                stack: 'vulnerabilities'
            }, {
                label: 'Medium',
                data: [20, 15, 25, 18, 22, 16],
                backgroundColor: '#FFC107',
                stack: 'vulnerabilities'
            }, {
                label: 'Low',
                data: [35, 28, 40, 32, 38, 30],
                backgroundColor: '#4CAF50',
                stack: 'vulnerabilities'
            }]
        };

        this.charts.security = new Chart(ctx, {
            type: 'bar',
            data: data,
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
                    x: {
                        stacked: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                }
            }
        });
    }

    updateChartsForDateRange(days) {
        // Update chart data based on selected date range
        const dateRangeData = {
            7: {
                velocity: {
                    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                    deployments: [2, 3, 1, 4, 2, 3, 2],
                    features: [1, 2, 1, 2, 1, 2, 1]
                },
                security: {
                    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                    critical: [1, 0, 2, 1, 0, 1, 0],
                    high: [2, 1, 3, 2, 1, 2, 1],
                    medium: [3, 2, 4, 3, 2, 3, 2],
                    low: [5, 4, 6, 5, 4, 5, 4]
                }
            },
            30: {
                velocity: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    deployments: [12, 19, 15, 22],
                    features: [8, 12, 10, 15]
                },
                security: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    critical: [5, 3, 8, 4],
                    high: [12, 8, 15, 10],
                    medium: [20, 15, 25, 18],
                    low: [35, 28, 40, 32]
                }
            },
            90: {
                velocity: {
                    labels: ['Month 1', 'Month 2', 'Month 3'],
                    deployments: [68, 72, 58],
                    features: [45, 52, 38]
                },
                security: {
                    labels: ['Month 1', 'Month 2', 'Month 3'],
                    critical: [20, 15, 25],
                    high: [45, 38, 52],
                    medium: [78, 65, 85],
                    low: [135, 118, 145]
                }
            },
            365: {
                velocity: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    deployments: [198, 225, 187, 210],
                    features: [135, 168, 142, 155]
                },
                security: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    critical: [60, 45, 75, 52],
                    high: [135, 112, 158, 128],
                    medium: [228, 195, 255, 218],
                    low: [405, 354, 435, 392]
                }
            }
        };

        const data = dateRangeData[days];

        // Update velocity chart
        if (this.charts.velocity) {
            this.charts.velocity.data.labels = data.velocity.labels;
            this.charts.velocity.data.datasets[0].data = data.velocity.deployments;
            this.charts.velocity.data.datasets[1].data = data.velocity.features;
            this.charts.velocity.update('active');
        }

        // Update security chart
        if (this.charts.security) {
            this.charts.security.data.labels = data.security.labels;
            this.charts.security.data.datasets[0].data = data.security.critical;
            this.charts.security.data.datasets[1].data = data.security.high;
            this.charts.security.data.datasets[2].data = data.security.medium;
            this.charts.security.data.datasets[3].data = data.security.low;
            this.charts.security.update('active');
        }
    }

    setupResponsive() {
        // Handle mobile menu if needed
        const handleResize = () => {
            // Resize charts
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.resize();
            });
        };

        window.addEventListener('resize', handleResize);

        // Setup filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filter security chart based on selection
                this.filterSecurityChart(btn.textContent);
            });
        });
    }

    filterSecurityChart(filter) {
        if (!this.charts.security) return;

        const datasets = this.charts.security.data.datasets;
        
        switch(filter) {
            case 'Critical':
                datasets.forEach((dataset, index) => {
                    dataset.hidden = index !== 0;
                });
                break;
            case 'High':
                datasets.forEach((dataset, index) => {
                    dataset.hidden = index !== 1;
                });
                break;
            case 'Medium':
                datasets.forEach((dataset, index) => {
                    dataset.hidden = index !== 2;
                });
                break;
            case 'All':
            default:
                datasets.forEach(dataset => {
                    dataset.hidden = false;
                });
                break;
        }
        
        this.charts.security.update('active');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MomentumDashboard();
});

// Add ripple effect to clickable elements
document.addEventListener('click', (e) => {
    const target = e.target.closest('.nav-item, .btn-icon, .filter-btn, .metric-card');
    if (!target) return;

    const ripple = document.createElement('span');
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 1000;
    `;

    target.style.position = 'relative';
    target.style.overflow = 'hidden';
    target.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
});

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);