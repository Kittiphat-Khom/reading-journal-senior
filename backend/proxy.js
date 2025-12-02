import express from "express";

import fetch from "node-fetch";

import cors from "cors";



const app = express();

app.use(express.json());

app.use(cors());



// 🔐 Token จาก Hardcover

const HARDCOVER_TOKEN =

  "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJIYXJkY292ZXIiLCJ2ZXJzaW9uIjoiOCIsImp0aSI6IjJjNWQ4MGFkLTQ3ZDctNDdkNy1iNDBmLTkxNmQ3MjJiNjI1ZiIsImFwcGxpY2F0aW9uSWQiOjIsInN1YiI6IjMyOTY4IiwiYXVkIjoiMSIsImlkIjoiMzI5NjgiLCJsb2dnZWRJbiI6dHJ1ZSwiaWF0IjoxNzYyNjg3MTQyLCJleHAiOjE3OTQyMjMxNDIsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJ1c2VyIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6InVzZXIiLCJ4LWhhc3VyYS1yb2xlIjoidXNlciIsIlgtaGFzdXJhLXVzZXItaWQiOiIzMjk2OCJ9LCJ1c2VyIjp7ImlkIjozMjk2OH19.Xfga0PncD1OeqUb6hiCTJCBPEkJOFeLmtQwLrpQg-Qk";



// 📌 Hardcover GraphQL endpoint

const HARD_COVER_GRAPHQL = "https://api.hardcover.app/v1/graphql";





// ======================================

// 🔎 1) Proxy สำหรับค้นหา /api/search

// ======================================

app.post("/api/search", async (req, res) => {

  try {

    console.log("🔹 Forwarding search:", req.body);



    const response = await fetch(HARD_COVER_GRAPHQL, {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        "Authorization": HARDCOVER_TOKEN,

      },

      // ส่ง body ตรง ๆ ไม่ต้อง destructure

      body: JSON.stringify(req.body),

    });



    // อ่านเป็น text ก่อน → debug HTML error

    const raw = await response.text();



    // ถ้า server ส่ง HTML กลับ → error ชัวร์

    if (raw.startsWith("<!DOCTYPE") || raw.startsWith("<html")) {

      console.error("❌ Hardcover returned HTML instead of JSON");

      return res.status(500).json({ error: "Hardcover returned HTML" });

    }



    const data = JSON.parse(raw);



    console.log("📦 Hardcover response:", data);

    res.json(data);



  } catch (error) {

    console.error("🔥 Proxy fetch error:", error);

    res.status(500).json({ error: error.message });

  }

});





// ======================================

// 💾 2) บันทึก preference /api/preferences/save

// ======================================

app.post("/api/preferences/save", async (req, res) => {

  try {

    const { books, authors, genres } = req.body;



    console.log("🎯 Preferences received:");

    console.log("▶ Books:", books);

    console.log("▶ Authors:", authors);

    console.log("▶ Genres:", genres);



    res.json({

      success: true,

      message: "Preferences saved successfully",

    });



  } catch (error) {

    console.error("🔥 Save preferences error:", error);

    res.status(500).json({ error: "Failed to save preferences" });

  }

});





// ======================================

// 🚀 Start Server

// ======================================

const PORT = 3000;

app.listen(PORT, () =>

  console.log(`✅ Proxy running on http://localhost:${PORT}`)

);