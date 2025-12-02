import mysql from "mysql2/promise";
import dotenv from "dotenv";

// โหลดค่าจากไฟล์ .env
dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306, // ถ้าไม่มีใน .env ให้ใช้ 3306
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ทดสอบการเชื่อมต่อ
pool.getConnection()
    .then(conn => {
        console.log("✅ Database connected successfully via Pool!");
        conn.release(); // คืน connection กลับเข้า pool
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err);
    });

export default pool;