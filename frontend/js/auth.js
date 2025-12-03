// ✅ บรรทัดที่ 1: ประกาศตัวแปรไว้ตรงนี้เลย
const API_BASE_URL = 'https://reading-journal.xyz';

// โหลดข้อมูลผู้ใช้จาก token
document.addEventListener("DOMContentLoaded", loadUser);

async function loadUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    // ✅ แนะนำให้ใช้ API_BASE_URL เพื่อความชัวร์ (หรือใช้ path เดิมก็ได้ถ้า server เดียวกัน)
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Auth failed");

    const user = await res.json();

    // ✅ FIX: เช็คก่อนว่ามี element นี้ในหน้าเว็บไหม ค่อยยัดค่าใส่
    const userNameEl = document.getElementById("user-name");
    const userEmailEl = document.getElementById("user-email");

    if (userNameEl) {
        userNameEl.textContent = user.username || "Unknown";
    }
    
    if (userEmailEl) {
        userEmailEl.textContent = user.email || "";
    }

  } catch (error) {
    console.error("Error loading user:", error);
  }
}

// ---- Logout ----
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "log-in-page.html";
  });
}