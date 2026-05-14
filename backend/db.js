import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 1. สร้างตัวแปร __dirname สำหรับ ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. โหลดไฟล์ .env โดยระบุ Path แบบเจาะจง (บังคับให้อ่านไฟล์ที่วางอยู่ข้างๆ db.js)
dotenv.config({ path: path.join(__dirname, '.env') });

console.log("--- 🔍 Checking Database Config ---");
console.log("Host:", process.env.MYSQLHOST || "❌ Undefined (Using Default)");
console.log("User:", process.env.MYSQLUSER);
console.log("Port:", process.env.MYSQLPORT || 3306);
console.log("-----------------------------------");

const pool = mysql.createPool({
    host: process.env.MYSQLHOST || '127.0.0.1', // ถ้าไม่เจอ ให้ใช้ 127.0.0.1 (บังคับ IPv4)
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// ทดสอบการเชื่อมต่อ
pool.getConnection()
    .then(conn => {
        console.log("✅ Database connected successfully via Pool!");
        conn.release(); 
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err.message);
    });

export default pool;