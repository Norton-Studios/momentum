/**
 * Momentum - Sophisticated Enterprise Dashboard
 * Refined interactions with elegant animations
 */

// Global State Management
const MomentumApp = {
    // Application state
    state: {
        currentView: 'organization',
        dateRange: '60d',
        selectedTeams: new Set(),
        selectedContributors: new Set(),
        isLoading: false,
        charts: {}
    },

    // Initialize application
    init() {
        this.initializeCharts();
        this.setupEventListeners();
        this.initializeLucideIcons();
        this.startPerformanceAnimations();
        console.log('Momentum Dashboard initialized');
    },

    // Initialize Lucide icons
    initializeLucideIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Date range selector
        document.querySelectorAll('.date-range-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.handleDateRangeChange(e.target);
            });
        });

        // Navigation items
        document.querySelectorAll('.dashboard-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigationChange(e.target);
            });
        });

        // Metric cards hover effects
        document.querySelectorAll('.metric-card').forEach(card => {
            this.addHoverEffects(card);
        });

        // Chart containers
        document.querySelectorAll('.chart-container').forEach(container => {
            this.addHoverEffects(container);
        });
    },

    // Handle date range changes
    handleDateRangeChange(selectedOption) {
        // Remove active class from all options
        document.querySelectorAll('.date-range-option').forEach(option => {
            option.classList.remove('active');
        });

        // Add active class to selected option
        selectedOption.classList.add('active');

        // Update state
        this.state.dateRange = selectedOption.textContent.trim();

        // Show loading state
        this.showLoadingState();

        // Simulate data refresh
        setTimeout(() => {
            this.refreshData();
            this.hideLoadingState();
        }, 1000);
    },

    // Handle navigation changes
    handleNavigationChange(selectedItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.dashboard-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected item
        selectedItem.classList.add('active');

        // Update state
        this.state.currentView = selectedItem.textContent.trim().toLowerCase();

        // Animate content change
        this.animateViewChange();
    },

    // Add hover effects to elements
    addHoverEffects(element) {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'translateY(-4px)';
            element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translateY(0)';
        });
    },

    // Show loading state
    showLoadingState() {
        this.state.isLoading = true;
        
        // Add loading spinner to metrics
        document.querySelectorAll('.metric-value').forEach(value => {
            const originalContent = value.innerHTML;
            value.dataset.original = originalContent;
            value.innerHTML = `<div class="loading-spinner"></div>`;
        });

        // Add loading state to charts
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.opacity = '0.6';
            container.style.pointerEvents = 'none';
        });
    },

    // Hide loading state
    hideLoadingState() {
        this.state.isLoading = false;
        
        // Restore metric values with animation
        document.querySelectorAll('.metric-value').forEach(value => {
            const originalContent = value.dataset.original;
            if (originalContent) {
                value.innerHTML = originalContent;
                value.style.animation = 'fadeInScale 0.5s ease-out';
            }
        });

        // Restore chart containers
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.opacity = '1';
            container.style.pointerEvents = 'auto';
        });
    },

    // Refresh data
    refreshData() {
        // Simulate data updates with animations
        this.updateMetricValues();
        this.updateCharts();
    },

    // Update metric values
    updateMetricValues() {
        const metrics = [
            { selector: '.metric-value', values: ['23', '94.7%', '2.3d', '1,247'] },
        ];

        document.querySelectorAll('.metric-value').forEach((element, index) => {
            // Simulate slight value changes
            const currentValue = element.textContent;
            const variation = Math.random() * 0.1 - 0.05; // ±5% variation
            
            setTimeout(() => {
                element.style.animation = 'pulseValue 0.8s ease-out';
            }, index * 100);
        });
    },

    // Update charts
    updateCharts() {
        Object.keys(this.state.charts).forEach(chartId => {
            const chart = this.state.charts[chartId];
            if (chart && chart.update) {
                // Add subtle animation to chart updates
                chart.options.animation = {
                    duration: 800,
                    easing: 'easeInOutQuart'
                };
                chart.update();
            }
        });
    },

    // Animate view changes
    animateViewChange() {
        const content = document.querySelector('.dashboard-content');
        if (content) {
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
                content.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 200);
        }
    },

    // Start performance animations
    startPerformanceAnimations() {
        // Animate metric cards on load
        document.querySelectorAll('.metric-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            }, index * 150);
        });

        // Animate chart containers
        document.querySelectorAll('.chart-container').forEach((container, index) => {
            container.style.opacity = '0';
            container.style.transform = 'translateX(50px)';
            
            setTimeout(() => {
                container.style.opacity = '1';
                container.style.transform = 'translateX(0)';
                container.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 600 + (index * 200));
        });
    },

    // Initialize charts
    initializeCharts() {
        // CVE Resolution Trends Chart
        const cveChart = this.createCVEChart();
        if (cveChart) this.state.charts.cveChart = cveChart;

        // Pipeline Stability Chart
        const pipelineChart = this.createPipelineChart();
        if (pipelineChart) this.state.charts.pipelineChart = pipelineChart;

        // Delivery Velocity Chart
        const velocityChart = this.createVelocityChart();
        if (velocityChart) this.state.charts.velocityChart = velocityChart;
    },

    // Create CVE Resolution Chart
    createCVEChart() {
        const ctx = document.getElementById('cveChart');
        if (!ctx || typeof Chart === 'undefined') return null;

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
                datasets: [
                    {
                        label: 'Critical',
                        data: [12, 19, 8, 15, 6, 9, 23, 18],
                        borderColor: '#DC2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'High',
                        data: [8, 14, 12, 20, 15, 18, 16, 22],
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Medium',
                        data: [25, 30, 28, 35, 32, 38, 40, 45],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1200,
                    easing: 'easeInOutQuart'
                }
            }
        });
    },

    // Create Pipeline Stability Chart
    createPipelineChart() {
        const ctx = document.getElementById('pipelineChart');
        if (!ctx || typeof Chart === 'undefined') return null;

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Successful', 'Failed', 'Cancelled'],
                datasets: [{
                    data: [94.7, 3.8, 1.5],
                    backgroundColor: [
                        '#10B981',
                        '#EF4444',
                        '#6B7280'
                    ],
                    borderWidth: 0,
                    cutout: '75%'
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
                            padding: 20,
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    },

    // Create Delivery Velocity Chart
    createVelocityChart() {
        const ctx = document.getElementById('velocityChart');
        if (!ctx || typeof Chart === 'undefined') return null;

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [
                    {
                        label: 'Feature Development',
                        data: [2.1, 2.4, 2.0, 2.8, 2.3, 2.1, 2.5, 2.2, 2.0, 2.4, 2.1, 2.3],
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Bug Fixes',
                        data: [1.2, 1.5, 1.1, 1.8, 1.4, 1.2, 1.6, 1.3, 1.1, 1.5, 1.2, 1.4],
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Hotfixes',
                        data: [0.8, 1.1, 0.7, 1.4, 1.0, 0.8, 1.2, 0.9, 0.7, 1.1, 0.8, 1.0],
                        backgroundColor: 'rgba(245, 158, 11, 0.8)',
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            callback: function(value) {
                                return value + 'd';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
};

// Utility Functions
const Utils = {
    // Debounce function for search inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format numbers with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Generate random color
    generateColor() {
        const colors = [
            '#667eea', '#764ba2', '#4facfe', '#00f2fe',
            '#f093fb', '#f5576c', '#43e97b', '#38f9d7',
            '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // Animate number counting
    animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = this.formatNumber(current);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i data-lucide="${this.getToastIcon(type)}" style="width: 16px; height: 16px;"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Style the toast
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border-left: 4px solid ${this.getToastColor(type)};
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease-out;
        `;

        document.body.appendChild(toast);
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    },

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type] || icons.info;
    },

    getToastColor(type) {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        return colors[type] || colors.info;
    }
};

// Advanced Animations
const Animations = {
    // Stagger animation for elements
    staggerAnimation(elements, delay = 100) {
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
                element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            }, index * delay);
        });
    },

    // Reveal animation on scroll
    revealOnScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('[data-reveal]').forEach(element => {
            observer.observe(element);
        });
    },

    // Parallax effect for background elements
    parallaxEffect() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('[data-parallax]');
            
            parallaxElements.forEach(element => {
                const speed = element.dataset.parallax || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        });
    }
};

// Add CSS animations
const addCustomCSS = () => {
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #e2e8f0;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes fadeInScale {
            0% {
                opacity: 0;
                transform: scale(0.8);
            }
            100% {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes pulseValue {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }

        @keyframes reveal {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .reveal {
            animation: reveal 0.6s ease-out forwards;
        }

        .toast-content {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
        }

        /* Hover effects */
        .metric-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .chart-container:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        /* Smooth transitions */
        .metric-card, .chart-container, .card, .data-table {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Focus states */
        .btn:focus,
        .form-control:focus,
        .date-range-option:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Loading states */
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        /* Responsive animations */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    document.head.appendChild(style);
};

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    addCustomCSS();
    MomentumApp.init();
    Animations.revealOnScroll();
    Animations.parallaxEffect();
    
    // Show welcome toast
    setTimeout(() => {
        Utils.showToast('Welcome to Momentum! Your dashboard is ready.', 'success');
    }, 1000);
});

// Export for use in other files
window.MomentumApp = MomentumApp;
window.MomentumUtils = Utils;
window.MomentumAnimations = Animations;