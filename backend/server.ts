
import express, { Request, Response, NextFunction } from 'express';
import sql from 'mssql';
import cors from 'cors';

const app = express();

// Explicit CORS configuration
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Database Configuration
const dbConfig: sql.config = {
  user: 'sa',
  password: 'Jayvee_0927',
  server: 'DT24-063\\JBPSQLSERVER', 
  database: 'jbpclinic',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000,
  },
};

async function generatePatientID(pool: sql.ConnectionPool): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const result = await pool.request()
    .input('year', sql.Int, year)
    .query('SELECT COUNT(*) as count FROM tblpatient WHERE YEAR(createdAt) = @year');
  
  const count = (result.recordset[0].count + 1).toString().padStart(4, '0');
  return `PID${year}${month}${count}`;
}

// Health check with explicit JSON header and 200 status
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Register Patient
app.post('/api/patient', async (req: Request, res: Response) => {
  const { patLastname, patFirstname, patMiddlename, patBirthdate } = req.body;

  if (!patLastname || !patFirstname || !patBirthdate) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const pkPatientID = await generatePatientID(pool);

    const result = await pool.request()
      .input('id', sql.VarChar, pkPatientID)
      .input('ln', sql.VarChar, patLastname)
      .input('fn', sql.VarChar, patFirstname)
      .input('mn', sql.VarChar, patMiddlename || '')
      .input('bd', sql.Date, patBirthdate)
      .query(`
        INSERT INTO tblpatient (pkPatientID, patLastname, patFirstname, patMiddlename, patBirthdate)
        VALUES (@id, @ln, @fn, @mn, @bd);
        SELECT * FROM tblpatient WHERE pkPatientID = @id;
      `);

    res.status(201).json({
  success: true,
  data: {
    pkPatientID,
  },
});

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, message: 'DB Error', error: err.message });
  } finally {
    if (pool) await pool.close();
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});
