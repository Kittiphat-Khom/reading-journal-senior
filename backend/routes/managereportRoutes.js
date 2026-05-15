import express from 'express';
import db from '../db.js'; 

const router = express.Router();

// ==============================================================
// ✅ แก้เป็น '/' เพราะใน server.js คุณประกาศ path เต็มไว้แล้ว
// ==============================================================

// GET: /api/admin/reports
// managereportRoutes.js

// ... (ส่วน import เดิม)

// managereportRoutes.js

// ... imports

// GET: /api/admin/reports
router.get('/', async (req, res) => {
    try {
        // 1. เพิ่ม managed_by, managed_at, management_note ใน SELECT
        const sql = `
            SELECT
                r.report_id, r.title, r.description, r.report_image,
                r.is_done, r.created_at,
                r.managed_by, r.managed_at, r.management_note,
                u.username
            FROM Report r
            LEFT JOIN User u ON u.user_id = r.user_id
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.query(sql);
        
        const reports = rows.map(report => {
            let images = [];
            if (report.report_image) {
                const raw = typeof report.report_image === 'string'
                    ? report.report_image
                    : report.report_image.toString('utf8');
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        images = parsed.map(b => b.startsWith('data:') ? b : `data:image/png;base64,${b}`);
                    } else {
                        images = [raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`];
                    }
                } catch {
                    images = [raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`];
                }
            }
            return {
                id: report.report_id,
                title: report.title,
                description: report.description,
                is_done: (report.is_done === 1),
                images,
                created_at: report.created_at,
                username: report.username,
                managed_by: report.managed_by,
                managed_at: report.managed_at,
                management_note: report.management_note
            };
        });

        res.json(reports);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: 'Error fetching reports' });
    }
});

// PUT: /api/admin/reports/:id/status
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    // 3. รับค่า managed_by (ชื่อแอดมิน) และ management_note (วิธีการแก้ไข) จาก Frontend
    const { is_done, management_note, managed_by } = req.body;
    
    try {
        const statusVal = is_done ? 1 : 0;
        
        // 4. อัปเดต SQL: บันทึกชื่อคนทำ, เวลา, และ Note
        const sql = `
            UPDATE Report 
            SET is_done = ?, 
                managed_at = NOW(), 
                managed_by = ?, 
                management_note = ?
            WHERE report_id = ?
        `;
        
        // ส่งค่า managed_by และ management_note เข้าไปใน Query
        await db.query(sql, [statusVal, managed_by, management_note, id]);
        
        res.json({ success: true });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ error: 'Error updating status' });
    }
});

export default router;