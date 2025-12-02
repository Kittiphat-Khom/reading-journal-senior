const API_BASE_URL = 'https://reading-journal.xyz';

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signupForm");
    const signupContainer = document.getElementById("signup-container");
    const successMessage = document.getElementById("success-message");
    const displayEmail = document.getElementById("display-email");
    const btnSignup = document.getElementById("btn-signup");
    const errorDiv = document.getElementById("signup-error");

    // ฟังก์ชันแสดง Error
    const showErrorMessage = (message, inputId = null) => {
        // ใช้ innerHTML เพื่อให้ใส่ icon ได้
        errorDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
        errorDiv.style.display = "block";
        
        if (inputId) {
            const inputElement = document.getElementById(inputId);
            if(inputElement) inputElement.classList.add('input-error');
        }

        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // ฟังก์ชันเคลียร์ Error
    const hideErrorMessage = () => {
        errorDiv.style.display = "none";
        document.querySelectorAll('input').forEach(input => input.classList.remove('input-error'));
    };

    // ฟังก์ชันตรวจสอบรูปแบบ Email (ต้องมี @ และ .)
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideErrorMessage();

        // 1. Get Values
        const username = document.getElementById("username_s").value.trim();
        const email = document.getElementById("email_s").value.trim();
        const password = document.getElementById("password_s").value;
        const confirmPassword = document.getElementById("confirm_password_s").value;

        // 2. Validation (ตรวจสอบความถูกต้อง)

        // 2.1 เช็คค่าว่าง
        if (!username || !email || !password || !confirmPassword) {
            showErrorMessage("Please fill in all fields.");
            return;
        }

        // 2.2 ✅ เช็ครูปแบบ Email (ส่วนที่ขาดไปก่อนหน้านี้)
        if (!isValidEmail(email)) {
            showErrorMessage("Invalid email format (e.g., user@example.com).", "email_s");
            return;
        }

        // 2.3 เช็คความยากรหัสผ่าน
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            showErrorMessage("Password must be at least 8 characters long and contain both letters and numbers.", "password_s");
            return;
        }

        // 2.4 เช็ครหัสผ่านตรงกัน
        if (password !== confirmPassword) {
            showErrorMessage("Passwords do not match.", "confirm_password_s");
            return;
        }

        // 3. Send to Server
        const originalBtnText = btnSignup.innerText;
        btnSignup.disabled = true;
        btnSignup.innerText = "Creating Account...";

        try {
            const res = await fetch("/api/users/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // ✅ Success
                signupContainer.style.display = "none";
                successMessage.style.display = "block";
                displayEmail.textContent = email;
            } else {
                // ❌ Error Handling (Force English 100%)
                btnSignup.disabled = false;
                btnSignup.innerText = originalBtnText;

                // ตรรกะใหม่: อ่าน Error จาก Server มาดูว่าเป็นเรื่องอะไร เเล้ว "แต่งประโยคใหม่เอง"
                const serverMsg = (data.message || "").toLowerCase(); // แปลงเป็นตัวเล็กเพื่อง่ายต่อการเช็ค

                if (serverMsg.includes("duplicate") || serverMsg.includes("exist") || serverMsg.includes("already") || serverMsg.includes("ใช้งานแล้ว") || serverMsg.includes("ซ้ำ")) {
                    showErrorMessage("Username or email is already taken. Please try another.");
                } else {
                    // ถ้าไม่รู้ว่าเป็น Error อะไร หรือเป็นภาษาไทยอื่นๆ ให้เหมาว่าเป็น System Error
                    // เพื่อป้องกันภาษาไทยหลุดออกมา
                    showErrorMessage("Registration failed. Please check your details.");
                }
            }
        } catch (err) {
            console.error("Error:", err);
            showErrorMessage("Unable to connect to the server.");
            btnSignup.disabled = false;
            btnSignup.innerText = originalBtnText;
        }
    });

    // UX: พิมพ์แก้แล้วให้ Error หายไป
    form.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", () => {
            if(errorDiv.style.display === 'block') hideErrorMessage();
        });
    });
});