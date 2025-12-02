document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const journalId = params.get("id");
    const token = localStorage.getItem("token");
    let myChart = null;

    const goBack = () => {
        if (document.referrer.includes("journal-detail.html")) {
             window.location.href = `journal-detail.html?id=${journalId}`;
        } else {
             window.history.back();
        }
    };
    const btnBack = document.getElementById('btn-back');
    const btnDone = document.getElementById('btn-done');
    if (btnBack) btnBack.addEventListener('click', goBack);
    if (btnDone) btnDone.addEventListener('click', goBack);

    if (!journalId) return;

    // 1. Load Data (แบบใหม่: ดึงจาก Journal แล้วแกะ JSON)
    async function loadDataAndRender() {
        try {
            // ✅ แก้ URL: ดึงข้อมูล Journal หลัก (ที่มี reading_log อยู่ข้างใน)
            const res = await fetch(`/api/journals/${journalId}`, {
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) throw new Error("Failed to fetch journal data");

            const journalData = await res.json();
            
            // ✅ แกะ reading_log (JSON String -> Array)
            let logs = [];
            if (journalData.reading_log) {
                try {
                    logs = (typeof journalData.reading_log === 'string') 
                           ? JSON.parse(journalData.reading_log) 
                           : journalData.reading_log;
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    logs = [];
                }
            }

            // แปลงรูปแบบข้อมูลให้เข้ากับกราฟ (Standardize Data Structure)
            // { created_at: "YYYY-MM-DD", duration_seconds: 120 }
            const processedSessions = logs.map(log => {
                // log.date อาจจะเป็น "2025-11-23" อยู่แล้ว
                // แปลงเป็น DD/MM/YYYY สำหรับแสดงผล
                const parts = log.date.split('-'); // [2025, 11, 23]
                const dateDisplay = (parts.length === 3) 
                    ? `${parts[2]}/${parts[1]}/${parts[0]}` // 23/11/2025
                    : log.date;

                return {
                    date_raw: log.date,
                    date_display: dateDisplay,
                    duration_seconds: parseInt(log.time) || 0
                };
            });

            renderSessionList(processedSessions);
            renderChart(processedSessions);
            calculateTotalTime(processedSessions);

        } catch (err) { console.error("Error loading data:", err); }
    }

    // 2. Render List
    function renderSessionList(sessions) {
        const list = document.getElementById('session-log-list');
        if (!list) return;
        list.innerHTML = "";

        // รวมยอดต่อวัน (เผื่อวันนึงอ่านหลายรอบ)
        const groupedData = {};
        sessions.forEach(session => {
            const date = session.date_display;
            if (!groupedData[date]) groupedData[date] = 0;
            groupedData[date] += session.duration_seconds;
        });

        // เรียงลำดับจากวันที่ล่าสุดขึ้นก่อน
        const listItems = Object.keys(groupedData).map(date => ({
            date: date, seconds: groupedData[date]
        })).reverse(); 

        if (listItems.length === 0) {
            list.innerHTML = "<li style='text-align:center; padding:20px; color:#ccc;'>No reading history yet.</li>";
            return;
        }

        listItems.forEach(item => {
            const li = document.createElement('li');
            li.className = "session-item"; 
            li.innerHTML = `<span class="session-date">${item.date}</span><span class="session-time-badge">${formatTime(item.seconds)}</span>`;
            list.appendChild(li);
        });
    }

    // 3. Render Chart
    function renderChart(sessions) {
        const ctxCanvas = document.getElementById('readingChart');
        if (!ctxCanvas) return;
        
        const ctx = ctxCanvas.getContext('2d');
        if (myChart) myChart.destroy();

        let labels = [], dataPoints = [];

        if (sessions.length > 0) {
            const dailyTotals = {};
            sessions.forEach(session => {
                const dateKey = session.date_display; 
                if (!dailyTotals[dateKey]) dailyTotals[dateKey] = 0;
                dailyTotals[dateKey] += session.duration_seconds;
            });

            // เอาแค่วันที่ที่มีข้อมูลมาพล็อต
            const uniqueDates = Object.keys(dailyTotals); 
            // เอา 7 วันล่าสุด (ถ้าอยากได้ทั้งหมดก็ตัด slice ออก)
            const recentDates = uniqueDates.slice(-7); 

            labels = recentDates;
            dataPoints = recentDates.map(date => (dailyTotals[date] / 60).toFixed(1)); // แปลงเป็นนาที
        } else {
            labels = ["No Data"]; dataPoints = [0];
        }

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes Read',
                    data: dataPoints,
                    backgroundColor: '#78AAC1',
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function calculateTotalTime(sessions) {
        const totalSec = sessions.reduce((sum, session) => sum + session.duration_seconds, 0);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const s = String(totalSec % 60).padStart(2, "0");
        const popupTime = document.getElementById('popup-total-time');
        if(popupTime) popupTime.innerHTML = `<span class="digit-box">${h}</span> : <span class="digit-box">${m}</span> : <span class="digit-box">${s}</span>`;
    }

    function formatTime(sec) {
        const h = String(Math.floor(sec / 3600)).padStart(2, "0");
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
        const s = String(sec % 60).padStart(2, "0");
        return `${h} : ${m} : ${s}`;
    }

    loadDataAndRender();
});