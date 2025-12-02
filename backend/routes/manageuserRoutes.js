import express from 'express';
import db from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// ==========================================
// 1. GET: ดึงรายชื่อผู้ใช้ทั้งหมด
// ==========================================
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT user_id, username, email, register_date AS created_at 
            FROM User 
            ORDER BY user_id DESC
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// ==========================================
// 2. POST: เพิ่มผู้ใช้ใหม่ (Add User)
// ==========================================
router.post('/add', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Please provide username, email, and password' });
    }

    try {
        const [exists] = await db.query("SELECT user_id FROM User WHERE email = ? OR username = ?", [email, username]);
        if (exists.length > 0) {
            return res.status(400).json({ error: 'Username or Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = "INSERT INTO User (username, email, password, register_date) VALUES (?, ?, ?, NOW())";
        await db.query(sql, [username, email, hashedPassword]);

        res.status(201).json({ success: true, message: "User added successfully" });

    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ error: 'Error adding user' });
    }
});

// ==========================================
// 3. PUT: แก้ไขข้อมูลผู้ใช้ (Edit User)
// ==========================================
router.put('/update/:id', async (req, res) => {
    const { username, email } = req.body;
    const id = req.params.id;

    if (!username || !email) {
        return res.status(400).json({ error: 'Please provide username and email' });
    }

    try {
        const sql = "UPDATE User SET username = ?, email = ? WHERE user_id = ?";
        await db.query(sql, [username, email, id]);
        
        res.json({ success: true, message: "User updated successfully" });

    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: 'Error updating user' });
    }
});

// ==========================================
// 4. DELETE: ย้ายไป In_active_user แล้วลบ (Archive & Delete)
// ==========================================
router.delete('/delete/:id', async (req, res) => {
    const userId = req.params.id;
    let connection = null;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction(); 

        // 4.1 ดึงข้อมูล User เก่าออกมาก่อน
        const [users] = await connection.query("SELECT * FROM User WHERE user_id = ?", [userId]);
        
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];

        // ⚠️ แก้ไขจุดที่ 1: เปลี่ยนชื่อคอลัมน์ปลายทางจาก password -> pwd
        // ⚠️ แก้ไขจุดที่ 2: เปลี่ยนชื่อคอลัมน์ปลายทางจาก created_at -> register_date
        const insertSql = `
            INSERT INTO In_active_user (user_id, username, email, pwd, register_date, deleted_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        // ตรวจสอบค่าที่จะใส่
        const userPwd = user.password || user.pwd || null;

        await connection.query(insertSql, [user.user_id, user.username, user.email, userPwd, user.register_date]);

        // 4.3 ลบข้อมูล Foreign Key ที่เกี่ยวข้อง
        await connection.query("DELETE FROM MPC WHERE user_id = ?", [userId]);
        await connection.query("DELETE FROM Report WHERE user_id = ?", [userId]);
        await connection.query("DELETE FROM Journal WHERE user_id = ?", [userId]);

        // 4.4 ลบ User ออกจากตารางหลัก
        await connection.query("DELETE FROM User WHERE user_id = ?", [userId]);

        await connection.commit(); 
        res.json({ success: true, message: "User moved to Inactive and deleted successfully" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error archiving user:", error);
        res.status(500).json({ error: 'Error deleting user' });
    } finally {
        if (connection) connection.release();
    }
});

export default router;