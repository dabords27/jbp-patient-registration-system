
export interface PatientFormData {
  patLastname: string;
  patFirstname: string;
  patMiddlename: string;
  patBirthdate: string;
}

export interface PatientRecord extends PatientFormData {
  pkPatientID: string;
  createdAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface OCRResult {
  lastname: string;
  firstname: string;
  middlename: string;
  birthdate: string; // YYYY-MM-DD
}
