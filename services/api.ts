const API_BASE = "https://jbp-backend-w5py.onrender.com";

export interface PatientPayload {
  patLastname: string;
  patFirstname: string;
  patMiddlename: string;
  patBirthdate: string;
}

export async function registerPatient(payload: PatientPayload) {
  const res = await fetch(`${API_BASE}/api/patient/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to register patient");
  }

  return await res.json();
}

export async function checkApiStatus() {
  const res = await fetch(`${API_BASE}/api/health`);

  if (!res.ok) {
    throw new Error("API not reachable");
  }

  return await res.json();
}
