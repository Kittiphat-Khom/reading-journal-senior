// ✅ บรรทัดที่ 1: ประกาศตัวแปรไว้ตรงนี้เลย
const API_BASE_URL = 'https://reading-journal.xyz';
// โหลดข้อมูลผู้ใช้จาก token
document.addEventListener("DOMContentLoaded", loadUser);

async function loadUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("/api/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Auth failed");

    const user = await res.json();

    // แสดงผลบน sidebar
    document.getElementById("user-name").textContent = user.username;
    document.getElementById("user-email").textContent = user.email;

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
