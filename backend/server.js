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
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

console.log("RUNNING FILE:", import.meta.url);
console.log("SUPABASE URL:", supabaseUrl);
console.log("NODE_ENV:", process.env.NODE_ENV);

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables");
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
app.use(express.urlencoded({ extended: true }));

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
    .select("pk_pat_mrn_id")
    .like("pk_pat_mrn_id", `${prefix}%`);

  if (error) throw error;

  const counter = String((data?.length || 0) + 1).padStart(4, "0");
  return `${prefix}${counter}`;
}

/* =========================
   CREATE PATIENT
========================= */
app.post("/api/patient/register", async (req, res) => {
  try {
    const { pat_lastname, pat_firstname, pat_middlename, pat_birthdate } = req.body;

    if (!pat_lastname || !pat_firstname || !pat_birthdate) {
      return res.status(400).json({
        success: false,
        message: "Lastname, Firstname, and Birthdate are required.",
      });
    }

    let formattedBirthdate = pat_birthdate;

    if (pat_birthdate.includes("/")) {
      const [month, day, year] = pat_birthdate.split("/");
      formattedBirthdate = `${year}-${month}-${day}`;
    }

    const pk_pat_mrn_id = await generatePatientID();

    const { data, error } = await supabase
      .from("tblpatientinfo")
      .insert([
        {
          pk_pat_mrn_id: pk_pat_mrn_id,
          pat_lastname: pat_lastname,
          pat_firstname: pat_firstname,
          pat_middlename: pat_middlename || null,
          pat_birthdate: formattedBirthdate,
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

    const lines = text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    let pat_lastname = "";
    let pat_firstname = "";
    let pat_middlename = "";
    let pat_birthdate = "";

    const nameLine = lines.find(l => l.includes(","));

    if (nameLine) {
      const parts = nameLine.split(",");
      pat_lastname = parts[0]?.trim() || "";

      const firstParts = parts[1]?.trim().split(" ");
      pat_firstname = firstParts?.[0] || "";
      pat_middlename = firstParts?.[1] || "";
    }

    const dateRegex = /(19|20)\d{2}[\/-]\d{2}[\/-]\d{2}/;
    const dateMatch = text.match(dateRegex);

    if (dateMatch) {
      const [year, month, day] = dateMatch[0].split(/[\/-]/);
      pat_birthdate = `${year}-${month}-${day}`;
    }

    res.json({
      pat_lastname,
      pat_firstname,
      pat_middlename,
      pat_birthdate,
      raw_text: text
    });

  } catch (err) {
    console.error("OCR ERROR:", err);
    res.status(500).json({ error: "OCR failed" });
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
