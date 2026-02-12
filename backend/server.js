import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import Tesseract from "tesseract.js";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";

/* =========================
   SUPABASE
========================= */
const supabaseUrl = "https://irsriyhmskbeojrdkvuc.supabase.co";
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

console.log("RUNNING FILE:", import.meta.url);
console.log("SUPABASE URL:", supabaseUrl);

if (!supabaseKey) {
  console.error("❌ SUPABASE_SECRET_KEY missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/* =========================
   INIT
========================= */
const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   UPLOADS SETUP
========================= */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}
const upload = multer({ dest: "uploads/" });

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "JBP Patient Registration API",
  });
});

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => {
  res.send("JBP Backend is running 🚀");
});

/* =========================
   PATIENT ID GENERATOR
========================= */
async function generatePatientID() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `PID${year}${month}`;

  const { data, error } = await supabase
    .from("tblpatientinfo")
    .select("pkpatientid")
    .like("pkpatientid", `${prefix}%`);

  if (error) throw error;

  const counter = String((data?.length || 0) + 1).padStart(4, "0");
  return `${prefix}${counter}`;
}

/* =========================
   CREATE PATIENT
========================= */
app.post("/api/patient/register", async (req, res) => {
  try {
    const { patLastname, patFirstname, patMiddlename, patBirthdate } = req.body;

    if (!patLastname || !patFirstname || !patBirthdate) {
      return res.status(400).json({
        success: false,
        message: "Lastname, Firstname, and Birthdate are required.",
      });
    }

    let formattedBirthdate = patBirthdate;

    if (patBirthdate.includes("/")) {
      const [month, day, year] = patBirthdate.split("/");
      formattedBirthdate = `${year}-${month}-${day}`;
    }

    const pkPatientID = await generatePatientID();

    const { data, error } = await supabase
      .from("tblpatientinfo")
      .insert([
        {
          pkpatientid: pkPatientID,
          patlastname: patLastname,
          patfirstname: patFirstname,
          patmiddlename: patMiddlename || null,
          patbirthdate: formattedBirthdate,
        },
      ])
      .select();

    if (error) {
      console.error("INSERT ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      data,
    });

  } catch (error) {
    console.error("❌ Backend Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* =========================
   OCR
========================= */
app.post("/api/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const {
      data: { text },
    } = await Tesseract.recognize(req.file.path, "eng");

    res.json({ rawText: text });

  } catch (err) {
    console.error("OCR ERROR:", err);
    res.status(500).json({ error: "OCR failed" });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

/* =========================
   GET PATIENTS
========================= */
app.get("/patients", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tblpatientinfo")
      .select("*");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   RAW TEST
========================= */
app.get("/rawtest", async (req, res) => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error("RAW FETCH ERROR:", err);
    res.status(500).json({
      name: err.name,
      message: err.message,
      cause: err.cause,
    });
  }
});

/* =========================
   GOOGLE TEST
========================= */
app.get("/ping", async (req, res) => {
  try {
    await fetch("https://google.com");
    res.send("Google reachable");
  } catch (err) {
    res.json({ error: err.message, cause: err.cause });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
