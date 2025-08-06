/**
 * High Contrast Data-Focused Dashboard - JavaScript
 * Momentum Design 9 - Chart.js Integration and Interactivity
 */

// High contrast color palette for charts
const CHART_COLORS = {
  primary: '#00ff00',
  secondary: '#ffff00',
  tertiary: '#ff00ff',
  quaternary: '#00ffff',
  success: '#00ff00',
  warning: '#ffff00',
  error: '#ff0000',
  info: '#00ffff',
  text: '#ffffff',
  background: '#000000',
  gridLines: '#333333'
};

// Chart configuration defaults for high contrast accessibility
Chart.defaults.color = CHART_COLORS.text;
Chart.defaults.backgroundColor = CHART_COLORS.background;
Chart.defaults.borderColor = CHART_COLORS.gridLines;
Chart.defaults.font.family = "'Consolas', 'Monaco', 'Courier New', monospace";
Chart.defaults.font.weight = '600';

// Global chart instances
let deploymentChart = null;
let leadTimeChart = null;
let performanceChart = null;

// Sample data for demonstration
const sampleData = {
  deployments: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
    data: [12, 18, 15, 22, 25, 28, 24]
  },
  leadTime: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [4.2, 3.8, 5.1, 4.5, 3.9, 2.8, 3.2]
  },
  teamPerformance: {
    labels: ['Frontend Team', 'Backend Team', 'DevOps Team', 'QA Team', 'Mobile Team'],
    data: [28, 22, 18, 16, 12]
  }
};

/**
 * Initialize the dashboard when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  showLoadingOverlay();
  
  // Initialize charts
  setTimeout(() => {
    initializeCharts();
    setupEventListeners();
    hideLoadingOverlay();
    announceToScreenReader('Dashboard loaded successfully');
  }, 1000);
});

/**
 * Show loading overlay with accessibility support
 */
function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
  }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('active');
  }
}

/**
 * Announce messages to screen readers
 */
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Initialize all charts with high contrast themes
 */
function initializeCharts() {
  initializeDeploymentChart();
  initializeLeadTimeChart();
  initializePerformanceChart();
}

/**
 * Initialize deployment frequency chart
 */
function initializeDeploymentChart() {
  const ctx = document.getElementById('deploymentChart');
  if (!ctx) return;

  deploymentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sampleData.deployments.labels,
      datasets: [{
        label: 'Deployments',
        data: sampleData.deployments.data,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primary + '20',
        borderWidth: 3,
        pointBackgroundColor: CHART_COLORS.primary,
        pointBorderColor: CHART_COLORS.background,
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.1,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      accessibility: {
        enabled: true
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.primary,
          borderWidth: 2,
          titleFont: {
            weight: 'bold'
          },
          bodyFont: {
            weight: '600'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: CHART_COLORS.gridLines,
            lineWidth: 1
          },
          ticks: {
            color: CHART_COLORS.text,
            font: {
              weight: '600'
            }
          }
        },
        y: {
          grid: {
            color: CHART_COLORS.gridLines,
            lineWidth: 1
          },
          ticks: {
            color: CHART_COLORS.text,
            font: {
              weight: '600'
            }
          },
          beginAtZero: true
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

/**
 * Initialize lead time trends chart
 */
function initializeLeadTimeChart() {
  const ctx = document.getElementById('leadTimeChart');
  if (!ctx) return;

  leadTimeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sampleData.leadTime.labels,
      datasets: [{
        label: 'Lead Time (hours)',
        data: sampleData.leadTime.data,
        borderColor: CHART_COLORS.secondary,
        backgroundColor: CHART_COLORS.secondary + '30',
        borderWidth: 3,
        pointBackgroundColor: CHART_COLORS.secondary,
        pointBorderColor: CHART_COLORS.background,
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      accessibility: {
        enabled: true
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.secondary,
          borderWidth: 2,
          titleFont: {
            weight: 'bold'
          },
          bodyFont: {
            weight: '600'
          },
          callbacks: {
            label: function(context) {
              return `Lead Time: ${context.parsed.y} hours`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: CHART_COLORS.gridLines,
            lineWidth: 1
          },
          ticks: {
            color: CHART_COLORS.text,
            font: {
              weight: '600'
            }
          }
        },
        y: {
          grid: {
            color: CHART_COLORS.gridLines,
            lineWidth: 1
          },
          ticks: {
            color: CHART_COLORS.text,
            font: {
              weight: '600'
            },
            callback: function(value) {
              return value + 'h';
            }
          },
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * Initialize team performance chart
 */
function initializePerformanceChart() {
  const ctx = document.getElementById('performanceChart');
  if (!ctx) return;

  performanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sampleData.teamPerformance.labels,
      datasets: [{
        data: sampleData.teamPerformance.data,
        backgroundColor: [
          CHART_COLORS.primary,
          CHART_COLORS.secondary,
          CHART_COLORS.tertiary,
          CHART_COLORS.quaternary,
          CHART_COLORS.info
        ],
        borderColor: CHART_COLORS.background,
        borderWidth: 3,
        hoverBorderWidth: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      accessibility: {
        enabled: true
      },
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            color: CHART_COLORS.text,
            font: {
              weight: '600',
              size: 12
            },
            usePointStyle: true,
            pointStyle: 'rect',
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.background,
          titleColor: CHART_COLORS.text,
          bodyColor: CHART_COLORS.text,
          borderColor: CHART_COLORS.primary,
          borderWidth: 2,
          titleFont: {
            weight: 'bold'
          },
          bodyFont: {
            weight: '600'
          },
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '50%'
    }
  });
}

/**
 * Setup event listeners for interactivity
 */
function setupEventListeners() {
  // Date range selector
  const dateRange = document.getElementById('dateRange');
  if (dateRange) {
    dateRange.addEventListener('change', handleDateRangeChange);
  }

  // Chart toggle buttons
  const chartToggles = document.querySelectorAll('.chart-toggle');
  chartToggles.forEach(toggle => {
    toggle.addEventListener('click', handleChartToggle);
  });

  // Navigation items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', handleNavigation);
  });

  // Keyboard navigation support
  document.addEventListener('keydown', handleKeyboardNavigation);

  // Window resize handler for responsive charts
  window.addEventListener('resize', debounce(handleWindowResize, 250));
}

/**
 * Handle date range changes
 */
function handleDateRangeChange(event) {
  const selectedRange = event.target.value;
  showLoadingOverlay();
  
  // Simulate data loading
  setTimeout(() => {
    updateChartsData(selectedRange);
    hideLoadingOverlay();
    announceToScreenReader(`Data updated for ${selectedRange} period`);
  }, 500);
}

/**
 * Handle chart type toggle
 */
function handleChartToggle(event) {
  const button = event.target;
  const chartName = button.dataset.chart;
  const chartType = button.dataset.type;
  
  // Update button states
  const siblingButtons = button.parentElement.querySelectorAll('.chart-toggle');
  siblingButtons.forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  
  // Update chart type
  switch(chartName) {
    case 'deployments':
      updateChartType(deploymentChart, chartType);
      break;
    case 'leadtime':
      updateChartType(leadTimeChart, chartType);
      break;
    case 'performance':
      updateChartType(performanceChart, chartType);
      break;
  }
  
  announceToScreenReader(`Chart updated to ${chartType} view`);
}

/**
 * Update chart type
 */
function updateChartType(chart, newType) {
  if (!chart) return;
  
  chart.config.type = newType;
  
  // Adjust configuration based on chart type
  if (newType === 'bar') {
    chart.config.data.datasets[0].backgroundColor = CHART_COLORS.primary + '80';
    chart.config.data.datasets[0].borderWidth = 2;
  } else if (newType === 'area') {
    chart.config.data.datasets[0].fill = true;
    chart.config.data.datasets[0].backgroundColor = CHART_COLORS.secondary + '30';
  } else if (newType === 'line') {
    chart.config.data.datasets[0].fill = false;
    chart.config.data.datasets[0].backgroundColor = CHART_COLORS.primary + '20';
  }
  
  chart.update('active');
}

/**
 * Handle navigation
 */
function handleNavigation(event) {
  event.preventDefault();
  
  // Update active state
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  const section = event.currentTarget.getAttribute('href').substring(1);
  announceToScreenReader(`Navigated to ${section} section`);
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(event) {
  // Escape key to close any modals or overlays
  if (event.key === 'Escape') {
    hideLoadingOverlay();
  }
  
  // Arrow keys for chart navigation
  if (event.target.classList.contains('chart-toggle')) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const toggles = event.target.parentElement.querySelectorAll('.chart-toggle');
      const currentIndex = Array.from(toggles).indexOf(event.target);
      let nextIndex;
      
      if (event.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : toggles.length - 1;
      } else {
        nextIndex = currentIndex < toggles.length - 1 ? currentIndex + 1 : 0;
      }
      
      toggles[nextIndex].focus();
      toggles[nextIndex].click();
    }
  }
}

/**
 * Handle window resize for responsive charts
 */
function handleWindowResize() {
  if (deploymentChart) deploymentChart.resize();
  if (leadTimeChart) leadTimeChart.resize();
  if (performanceChart) performanceChart.resize();
}

/**
 * Update charts data based on selected time range
 */
function updateChartsData(timeRange) {
  // Generate sample data based on time range
  let newData;
  
  switch(timeRange) {
    case '7d':
      newData = generateSampleData(7, 'daily');
      break;
    case '30d':
      newData = generateSampleData(30, 'daily');
      break;
    case '90d':
      newData = generateSampleData(13, 'weekly');
      break;
    case '1y':
      newData = generateSampleData(12, 'monthly');
      break;
    default:
      newData = sampleData;
  }
  
  // Update deployment chart
  if (deploymentChart) {
    deploymentChart.data.labels = newData.deployments.labels;
    deploymentChart.data.datasets[0].data = newData.deployments.data;
    deploymentChart.update('active');
  }
  
  // Update lead time chart
  if (leadTimeChart) {
    leadTimeChart.data.labels = newData.leadTime.labels;
    leadTimeChart.data.datasets[0].data = newData.leadTime.data;
    leadTimeChart.update('active');
  }
  
  // Update performance chart data (simulate team performance changes)
  if (performanceChart) {
    performanceChart.data.datasets[0].data = newData.teamPerformance.data;
    performanceChart.update('active');
  }
}

/**
 * Generate sample data for different time ranges
 */
function generateSampleData(periods, type) {
  const labels = [];
  const deploymentData = [];
  const leadTimeData = [];
  
  for (let i = 0; i < periods; i++) {
    if (type === 'daily') {
      labels.push(`Day ${i + 1}`);
    } else if (type === 'weekly') {
      labels.push(`Week ${i + 1}`);
    } else if (type === 'monthly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels.push(months[i % 12]);
    }
    
    // Generate realistic but random data
    deploymentData.push(Math.floor(Math.random() * 20) + 10);
    leadTimeData.push(Math.random() * 3 + 2);
  }
  
  return {
    deployments: { labels, data: deploymentData },
    leadTime: { labels, data: leadTimeData },
    teamPerformance: {
      labels: sampleData.teamPerformance.labels,
      data: sampleData.teamPerformance.data.map(val => 
        Math.max(5, val + Math.floor(Math.random() * 10) - 5)
      )
    }
  };
}

/**
 * Debounce function to limit function calls
 */
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

/**
 * Utility function to format numbers for accessibility
 */
function formatNumberForScreenReader(number) {
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + ' million';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + ' thousand';
  } else {
    return number.toString();
  }
}

/**
 * Export functions for testing (if in test environment)
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeCharts,
    updateChartsData,
    generateSampleData,
    formatNumberForScreenReader,
    CHART_COLORS
  };
}