document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signupForm");
    const signupContainer = document.getElementById("signup-container");
    const successMessage = document.getElementById("success-message");
    const displayEmail = document.getElementById("display-email");
    const btnSignup = document.getElementById("btn-signup");
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      // 1. ดึงค่าจากฟอร์ม
      const username = document.getElementById("username_s").value.trim();
      const email = document.getElementById("email_s").value.trim();
      const password = document.getElementById("password_s").value;
      const confirmPassword = document.getElementById("confirm_password_s").value;
  
      // 2. ตรวจสอบความถูกต้องเบื้องต้น
      if (password !== confirmPassword) {
        alert("❌ Passwords do not match!");
        return;
      }
  
      // ล็อกปุ่มเพื่อป้องกันการกดซ้ำ
      const originalBtnText = btnSignup.innerText;
      btnSignup.disabled = true;
      btnSignup.innerText = "Signing up...";
  
      try {
        // 3. ส่งข้อมูลไปยัง Backend
        const res = await fetch("/api/users/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }), // Backend อาจจะใช้ key 'password' หรือ 'pwd' เช็คให้ตรงกับ User.js
        });
  
        const data = await res.json();
  
        if (res.ok) {
          // ✅ กรณีสำเร็จ: ซ่อนฟอร์ม และแสดงหน้าแจ้งเตือนอีเมล
          signupContainer.style.display = "none";
          successMessage.style.display = "block";
          
          // แสดงอีเมลที่ผู้ใช้กรอก เพื่อให้รู้ว่าส่งไปที่ไหน
          displayEmail.textContent = email;
        } else {
          // กรณีผิดพลาด (เช่น Username ซ้ำ)
          alert("❌ " + (data.message || "Registration failed"));
          btnSignup.disabled = false;
          btnSignup.innerText = originalBtnText;
        }
      } catch (err) {
        console.error("Error:", err);
        alert("⚠️ Connection error. Please try again later.");
        btnSignup.disabled = false;
        btnSignup.innerText = originalBtnText;
      }
    });
  });