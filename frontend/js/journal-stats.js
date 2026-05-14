// js/journal-stats.js — Reading Statistics Chart

document.addEventListener("DOMContentLoaded", () => {
    let myChart = null;

    const btnOpenStats = document.getElementById("btn-open-stats");
    const statsModal = document.getElementById("stats-modal");
    const btnCloseStats = document.getElementById("btn-close-stats");
    const timeSelector = document.getElementById("time-range-selector");

    if (btnOpenStats) {
        btnOpenStats.addEventListener("click", (e) => {
            e.preventDefault();
            const app = window.JournalApp || {};
            if (app.lastSessionSeconds > 0) {
                showToast("Warning", "Please save your new reading time first!", "error");
                return;
            }
            statsModal.classList.remove("hidden");
            updateChart("week");
        });
    }

    if (btnCloseStats) btnCloseStats.addEventListener("click", () => { statsModal.classList.add("hidden"); });

    if (timeSelector) timeSelector.addEventListener("change", (e) => { updateChart(e.target.value); });

    function updateChart(rangeType) {
        const ctx = document.getElementById('readingChart').getContext('2d');

        let gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

        const rawLogs = (window.JournalApp && window.JournalApp.currentReadingLogs) || [];
        const today = new Date();
        let labels = [];
        let dataPoints = [];
        let xTitle = "";

        if (rangeType === 'week') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const checkDateStr = d.toISOString().split('T')[0];
                labels.push(d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
                const sumSeconds = rawLogs.filter(log => log.date === checkDateStr).reduce((acc, curr) => acc + curr.time, 0);
                dataPoints.push((sumSeconds / 60).toFixed(2));
            }
            xTitle = "Last 7 Days";

        } else if (rangeType === 'month') {
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            const currentYear = today.getFullYear();
            const monthName = today.toLocaleString('en-US', { month: 'short' });
            for (let i = 1; i <= daysInMonth; i++) {
                const dayStr = String(i).padStart(2, '0');
                const fullDate = `${currentYear}-${currentMonth}-${dayStr}`;
                labels.push(dayStr);
                const sumSeconds = rawLogs.filter(log => log.date === fullDate).reduce((acc, curr) => acc + curr.time, 0);
                dataPoints.push((sumSeconds / 60).toFixed(2));
            }
            xTitle = `${monthName} ${currentYear}`;

        } else if (rangeType === 'year') {
            const currentYear = today.getFullYear();
            labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            for (let i = 0; i < 12; i++) {
                const sumSeconds = rawLogs
                    .filter(log => { const d = new Date(log.date); return d.getMonth() === i && d.getFullYear() === currentYear; })
                    .reduce((acc, curr) => acc + curr.time, 0);
                dataPoints.push((sumSeconds / 60).toFixed(2));
            }
            xTitle = `Year ${currentYear}`;
        }

        document.getElementById("chart-description").innerText = `Total reading time (Minutes) - ${xTitle}`;

        if (myChart) myChart.destroy();

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Minutes',
                    data: dataPoints,
                    backgroundColor: gradient,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                    barThickness: 'flex',
                    maxBarThickness: 40,
                    hoverBackgroundColor: 'rgba(37, 99, 235, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000, easing: 'easeOutQuart' },
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: 10,
                        border: { display: false },
                        grid: { color: '#f1f5f9', tickLength: 0 },
                        ticks: { font: { family: "'Prompt', sans-serif", size: 11 }, color: '#64748b', padding: 10 }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { family: "'Prompt', sans-serif", size: 11 }, color: '#64748b' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { family: "'Prompt', sans-serif", size: 13 },
                        bodyFont: { family: "'Prompt', sans-serif", size: 13 },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: { label: (context) => `⏱ ${context.parsed.y} mins` }
                    }
                }
            }
        });
    }
});
