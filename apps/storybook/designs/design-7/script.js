// Retro Terminal Dashboard - Interactive Scripts
// Momentum Dashboard Design 7

class TerminalDashboard {
    constructor() {
        this.charts = {};
        this.currentDateRange = 7;
        this.terminalLines = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.startRealTimeUpdates();
        this.updateTerminalTime();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Date range selector
        document.querySelectorAll('.date-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDateRangeChange(e));
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Chart controls
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleChartTypeChange(e));
        });

        // Custom date inputs
        document.getElementById('startDate')?.addEventListener('change', () => this.validateDateRange());
        document.getElementById('endDate')?.addEventListener('change', () => this.validateDateRange());

        // Apply custom date range
        document.querySelector('.apply-btn')?.addEventListener('click', () => this.applyCustomDateRange());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());
    }

    handleDateRangeChange(event) {
        const button = event.target;
        const range = button.dataset.range;

        // Update active state
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Handle custom range
        const customInputs = document.getElementById('customDateInputs');
        if (range === 'custom') {
            customInputs.style.display = 'flex';
            this.setDefaultCustomDates();
        } else {
            customInputs.style.display = 'none';
            this.currentDateRange = parseInt(range);
            this.updateChartsData();
            this.logTerminalMessage('INFO', `Date range updated to last ${range} days`);
        }
    }

    setDefaultCustomDates() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }

    validateDateRange() {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);

        if (startDate >= endDate) {
            this.logTerminalMessage('WARN', 'Start date must be before end date');
            return false;
        }

        if (endDate > new Date()) {
            this.logTerminalMessage('WARN', 'End date cannot be in the future');
            return false;
        }

        return true;
    }

    applyCustomDateRange() {
        if (this.validateDateRange()) {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            
            this.currentDateRange = 'custom';
            this.updateChartsData();
            this.logTerminalMessage('SUCCESS', `Custom date range applied: ${startDate} to ${endDate}`);
        }
    }

    handleNavigation(event) {
        event.preventDefault();
        const link = event.currentTarget;
        const targetId = link.getAttribute('href').substring(1);

        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        link.closest('.nav-item').classList.add('active');

        // Simulate navigation
        this.logTerminalMessage('INFO', `Navigating to ${targetId} module...`);
        
        // Update command prompt
        this.updateCommandPrompt(targetId);
    }

    updateCommandPrompt(module) {
        const commandElement = document.querySelector('.command');
        if (commandElement) {
            commandElement.textContent = `momentum ${module} --view=overview --date-range=${this.currentDateRange}`;
        }
    }

    handleChartTypeChange(event) {
        const button = event.target;
        const chartContainer = button.closest('.chart-container');
        const chartType = button.textContent.toLowerCase();

        // Update active state
        chartContainer.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Get chart canvas
        const canvas = chartContainer.querySelector('canvas');
        const chartId = canvas.id;

        // Recreate chart with new type
        this.recreateChart(chartId, chartType);
        this.logTerminalMessage('INFO', `Chart type changed to ${chartType} for ${chartId}`);
    }

    recreateChart(chartId, type) {
        // Destroy existing chart
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
        }

        // Create new chart based on type and ID
        switch (chartId) {
            case 'deploymentChart':
                this.createDeploymentChart(type);
                break;
            case 'pipelineChart':
                this.createPipelineChart(type);
                break;
            case 'teamPerformanceChart':
                this.createTeamPerformanceChart(type);
                break;
        }
    }

    initializeCharts() {
        this.createDeploymentChart('line');
        this.createPipelineChart('doughnut');
        this.createTeamPerformanceChart('commits');
    }

    createDeploymentChart(type = 'line') {
        const ctx = document.getElementById('deploymentChart');
        if (!ctx) return;

        const data = this.generateDeploymentData();
        
        const config = {
            type: type === 'area' ? 'line' : type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#00ff41',
                            font: {
                                family: 'Source Code Pro, monospace',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#00ff41',
                        bodyColor: '#00cc33',
                        borderColor: '#00ff41',
                        borderWidth: 1,
                        titleFont: {
                            family: 'Source Code Pro, monospace'
                        },
                        bodyFont: {
                            family: 'Source Code Pro, monospace'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#008822',
                            font: {
                                family: 'Source Code Pro, monospace',
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 255, 65, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#008822',
                            font: {
                                family: 'Source Code Pro, monospace',
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 255, 65, 0.1)'
                        }
                    }
                }
            }
        };

        // Configure area chart
        if (type === 'area') {
            config.data.datasets[0].fill = true;
            config.data.datasets[0].backgroundColor = 'rgba(0, 255, 65, 0.1)';
        }

        this.charts.deploymentChart = new Chart(ctx, config);
    }

    createPipelineChart(type = 'doughnut') {
        const ctx = document.getElementById('pipelineChart');
        if (!ctx) return;

        const data = {
            labels: ['Successful', 'Failed', 'Cancelled', 'In Progress'],
            datasets: [{
                data: [287, 12, 4, 8],
                backgroundColor: [
                    '#00ff41',
                    '#ff4444',
                    '#ffaa00',
                    '#888888'
                ],
                borderColor: '#0a0a0a',
                borderWidth: 2
            }]
        };

        const config = {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#00ff41',
                            font: {
                                family: 'Source Code Pro, monospace',
                                size: 12
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#00ff41',
                        bodyColor: '#00cc33',
                        borderColor: '#00ff41',
                        borderWidth: 1,
                        titleFont: {
                            family: 'Source Code Pro, monospace'
                        },
                        bodyFont: {
                            family: 'Source Code Pro, monospace'
                        }
                    }
                }
            }
        };

        this.charts.pipelineChart = new Chart(ctx, config);
    }

    createTeamPerformanceChart(type = 'commits') {
        const ctx = document.getElementById('teamPerformanceChart');
        if (!ctx) return;

        const data = this.generateTeamPerformanceData(type);

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#00ff41',
                            font: {
                                family: 'Source Code Pro, monospace',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#00ff41',
                        bodyColor: '#00cc33',
                        borderColor: '#00ff41',
                        borderWidth: 1,
                        titleFont: {
                            family: 'Source Code Pro, monospace'
                        },
                        bodyFont: {
                            family: 'Source Code Pro, monospace'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#008822',
                            font: {
                                family: 'Source Code Pro, monospace',
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 255, 65, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#008822',
                            font: {
                                family: 'Source Code Pro, monospace',
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 255, 65, 0.1)'
                        }
                    }
                }
            }
        };

        this.charts.teamPerformanceChart = new Chart(ctx, config);
    }

    generateDeploymentData() {
        const labels = [];
        const data = [];
        const now = new Date();

        for (let i = this.currentDateRange - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            // Generate realistic deployment data
            const baseValue = 2 + Math.sin(i * 0.5) * 1.5;
            const noise = (Math.random() - 0.5) * 1;
            data.push(Math.max(0, Math.round((baseValue + noise) * 10) / 10));
        }

        return {
            labels: labels,
            datasets: [{
                label: 'Deployments per Day',
                data: data,
                borderColor: '#00ff41',
                backgroundColor: 'rgba(0, 255, 65, 0.1)',
                tension: 0.4,
                pointBackgroundColor: '#00ff41',
                pointBorderColor: '#00cc33',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        };
    }

    generateTeamPerformanceData(type) {
        const teams = ['Frontend', 'Backend', 'DevOps', 'QA', 'Design'];
        let data, label;

        switch (type) {
            case 'commits':
                data = [145, 132, 89, 67, 34];
                label = 'Commits';
                break;
            case 'prs':
                data = [28, 31, 19, 15, 8];
                label = 'Pull Requests';
                break;
            case 'issues':
                data = [12, 18, 8, 23, 6];
                label = 'Issues Resolved';
                break;
            default:
                data = [145, 132, 89, 67, 34];
                label = 'Commits';
        }

        return {
            labels: teams,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: [
                    '#00ff41',
                    '#00cc33',
                    '#33ff66',
                    '#008822',
                    '#66ff99'
                ],
                borderColor: '#0a0a0a',
                borderWidth: 1
            }]
        };
    }

    updateChartsData() {
        // Update deployment chart
        if (this.charts.deploymentChart) {
            const newData = this.generateDeploymentData();
            this.charts.deploymentChart.data = newData;
            this.charts.deploymentChart.update();
        }

        // Update team performance chart
        if (this.charts.teamPerformanceChart) {
            const activeType = document.querySelector('.chart-container:last-child .chart-btn.active')?.textContent.toLowerCase() || 'commits';
            const newData = this.generateTeamPerformanceData(activeType);
            this.charts.teamPerformanceChart.data = newData;
            this.charts.teamPerformanceChart.update();
        }

        // Update metrics
        this.updateMetrics();
    }

    updateMetrics() {
        // Simulate metric updates based on date range
        const metrics = this.generateMetrics();
        
        // Update CVE count
        const cveValue = document.querySelector('.metric-card:nth-child(1) .value-number');
        const cveChange = document.querySelector('.metric-card:nth-child(1) .value-change');
        if (cveValue) cveValue.textContent = metrics.cve.value;
        if (cveChange) cveChange.textContent = metrics.cve.change;

        // Update Pipeline Stability
        const pipelineValue = document.querySelector('.metric-card:nth-child(2) .value-number');
        const pipelineChange = document.querySelector('.metric-card:nth-child(2) .value-change');
        if (pipelineValue) pipelineValue.textContent = metrics.pipeline.value;
        if (pipelineChange) pipelineChange.textContent = metrics.pipeline.change;

        // Update Delivery Velocity
        const velocityValue = document.querySelector('.metric-card:nth-child(3) .value-number');
        const velocityChange = document.querySelector('.metric-card:nth-child(3) .value-change');
        if (velocityValue) velocityValue.textContent = metrics.velocity.value;
        if (velocityChange) velocityChange.textContent = metrics.velocity.change;

        // Update Code Coverage
        const coverageValue = document.querySelector('.metric-card:nth-child(4) .value-number');
        const coverageChange = document.querySelector('.metric-card:nth-child(4) .value-change');
        if (coverageValue) coverageValue.textContent = metrics.coverage.value;
        if (coverageChange) coverageChange.textContent = metrics.coverage.change;
    }

    generateMetrics() {
        // Generate metrics based on current date range
        const multiplier = this.currentDateRange / 30;
        
        return {
            cve: {
                value: Math.round(15 + Math.random() * 20 * multiplier),
                change: (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 10).toFixed(1) + '%'
            },
            pipeline: {
                value: (85 + Math.random() * 15).toFixed(1) + '%',
                change: '+' + (Math.random() * 5).toFixed(1) + '%'
            },
            velocity: {
                value: (1.5 + Math.random() * 2).toFixed(1),
                change: (Math.random() > 0.6 ? '+' : '-') + (Math.random() * 2).toFixed(1) + '%'
            },
            coverage: {
                value: (80 + Math.random() * 15).toFixed(1) + '%',
                change: '+' + (Math.random() * 3).toFixed(1) + '%'
            }
        };
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + R: Refresh data
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            this.refreshData();
        }

        // Ctrl/Cmd + L: Clear terminal
        if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
            event.preventDefault();
            this.clearTerminal();
        }

        // ESC: Close custom date inputs
        if (event.key === 'Escape') {
            const customInputs = document.getElementById('customDateInputs');
            if (customInputs && customInputs.style.display !== 'none') {
                customInputs.style.display = 'none';
                document.querySelector('.date-btn[data-range="7"]').classList.add('active');
                document.querySelector('.date-btn[data-range="custom"]').classList.remove('active');
            }
        }
    }

    handleResize() {
        // Redraw charts on window resize
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }

    startRealTimeUpdates() {
        // Update terminal time every second
        setInterval(() => {
            this.updateTerminalTime();
        }, 1000);

        // Update system uptime every minute
        setInterval(() => {
            this.updateSystemUptime();
        }, 60000);

        // Add random terminal messages
        setInterval(() => {
            this.addRandomTerminalMessage();
        }, 15000);

        // Update metrics every 2 minutes
        setInterval(() => {
            this.updateMetrics();
            this.logTerminalMessage('INFO', 'Metrics refreshed automatically');
        }, 120000);
    }

    updateTerminalTime() {
        const timeElement = document.getElementById('terminalTime');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    updateSystemUptime() {
        const uptimeElement = document.getElementById('uptime');
        if (uptimeElement) {
            // Simulate increasing uptime
            const current = uptimeElement.textContent;
            const match = current.match(/(\d+)d (\d+)h (\d+)m/);
            if (match) {
                let [, days, hours, minutes] = match.map(Number);
                minutes++;
                if (minutes >= 60) {
                    minutes = 0;
                    hours++;
                    if (hours >= 24) {
                        hours = 0;
                        days++;
                    }
                }
                uptimeElement.textContent = `${days}d ${hours}h ${minutes}m`;
            }
        }
    }

    addRandomTerminalMessage() {
        const messages = [
            { level: 'INFO', message: 'Data sync completed successfully' },
            { level: 'INFO', message: 'Monitoring 14 active repositories' },
            { level: 'SUCCESS', message: 'Performance metrics within normal range' },
            { level: 'INFO', message: 'Cache cleanup completed' },
            { level: 'WARNING', message: 'Disk usage at 78% capacity' },
            { level: 'INFO', message: 'Background job queue processing normally' },
            { level: 'SUCCESS', message: 'All external APIs responding normally' }
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.logTerminalMessage(randomMessage.level, randomMessage.message);
    }

    logTerminalMessage(level, message) {
        const output = document.getElementById('terminalOutput');
        if (!output) return;

        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const line = document.createElement('div');
        line.className = 'output-line';
        line.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="log-level ${level.toLowerCase()}">${level}</span>
            <span class="log-message">${message}</span>
        `;

        // Insert before cursor line
        const cursorLine = output.querySelector('.cursor-line');
        if (cursorLine) {
            output.insertBefore(line, cursorLine);
        } else {
            output.appendChild(line);
        }

        // Keep only last 50 messages
        const lines = output.querySelectorAll('.output-line:not(.cursor-line)');
        if (lines.length > 50) {
            lines[0].remove();
        }

        // Auto-scroll to bottom
        output.scrollTop = output.scrollHeight;
    }

    clearTerminal() {
        const output = document.getElementById('terminalOutput');
        if (output) {
            // Keep only the cursor line
            const cursorLine = output.querySelector('.cursor-line');
            output.innerHTML = '';
            if (cursorLine) {
                output.appendChild(cursorLine);
            }
            this.logTerminalMessage('INFO', 'Terminal cleared');
        }
    }

    refreshData() {
        this.logTerminalMessage('INFO', 'Refreshing dashboard data...');
        
        // Simulate data refresh
        setTimeout(() => {
            this.updateChartsData();
            this.logTerminalMessage('SUCCESS', 'Dashboard data refreshed successfully');
        }, 1000);
    }

    loadInitialData() {
        this.logTerminalMessage('INFO', 'Loading initial dashboard data...');
        
        setTimeout(() => {
            this.logTerminalMessage('SUCCESS', 'Dashboard initialized successfully');
            this.logTerminalMessage('INFO', 'Connected to data sources: GitHub, Jira, SonarQube');
            this.logTerminalMessage('WARNING', 'High CVE count detected in production environment');
            this.logTerminalMessage('INFO', 'Refreshing metrics... next update in 60 seconds');
        }, 500);
    }
}

// Global functions
function clearTerminal() {
    if (window.terminalDashboard) {
        window.terminalDashboard.clearTerminal();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.terminalDashboard = new TerminalDashboard();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.terminalDashboard) {
        window.terminalDashboard.logTerminalMessage('INFO', 'Dashboard tab became active');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.terminalDashboard) {
        window.terminalDashboard.logTerminalMessage('SUCCESS', 'Connection restored');
    }
});

window.addEventListener('offline', () => {
    if (window.terminalDashboard) {
        window.terminalDashboard.logTerminalMessage('WARNING', 'Connection lost - operating in offline mode');
    }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerminalDashboard;
}