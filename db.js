import sql from "mssql";

const config = {
  user: "sa",
  password: "Jayvee_0927",
  server: "DT24-063\\JBPSQLSERVER",
  database: "jbpclinic",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

export { sql, config };
