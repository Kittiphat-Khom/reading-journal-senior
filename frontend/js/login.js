// js/login.js

// ฟังก์ชันสำหรับลิงก์ทั่วไป (เช่น ปุ่ม Back หรือ Forgot Password)
function navigateTo(pageUrl) {
    window.location.href = pageUrl;
}

// รอให้หน้าเว็บโหลดเสร็จก่อนทำงาน
document.addEventListener("DOMContentLoaded", () => {
    
    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", async function(event) {
            event.preventDefault(); // ป้องกันเว็บรีเฟรช

            const usernameInput = document.getElementById("username_l");
            const passwordInput = document.getElementById("password_l");
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            const submitBtn = loginForm.querySelector("button[type='submit']");

            // Validation เบื้องต้น
            if (!username || !password) {
                alert("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
                return;
            }

            // เปลี่ยนข้อความปุ่มเพื่อบอกสถานะ
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Logging in...";
            submitBtn.disabled = true;

            try {
                // ยิง API ไปที่ Backend (ตรวจสอบ Port ให้ตรงกับ Server ของคุณ)
                const response = await fetch("/api/users/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // ✅ 1. เก็บ Token
                    localStorage.setItem("token", data.token);

                    // (Optional) เก็บข้อมูล User พื้นฐาน
                    if (data.user) {
                        localStorage.setItem("user", JSON.stringify(data.user));
                    }

                    // ✅ 2. เช็คว่าเคยเลือก Preference หรือยัง? (Logic สำคัญ)
                    if (data.has_preferences === true) {
                        // ถ้าเคยเลือกแล้ว -> ไปหน้า Dashboard เลย
                        // alert("เข้าสู่ระบบสำเร็จ!");
                        window.location.href = "dashboard-page.html"; 
                    } else {
                        // ถ้ายังไม่เคยเลือก -> บังคับไปหน้าเลือก Genre
                        // alert("กรุณาเลือกความสนใจของคุณก่อน");
                        window.location.href = "manage-pre-genre.html";
                    }

                } else {
                    // กรณี Login ไม่ผ่าน
                    alert(data.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
                }
            } catch (error) {
                console.error("Login error:", error);
                alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
            } finally {
                // คืนค่าปุ่มกลับสู่สภาพเดิม
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
        
            }
        });
    }
console.error("❌ Token Verify Error:", err.message);
});