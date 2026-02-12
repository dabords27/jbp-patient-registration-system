export interface OCRResult {
  patLastname: string;
  patFirstname: string;
  patMiddlename: string;
  patBirthdate: string; // MM/DD/YYYY
}

export async function performOCR(file: File): Promise<OCRResult> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("OCR request failed");
  }

  const data = await response.json();

  return {
    patLastname: data.patLastname || "",
    patFirstname: data.patFirstname || "",
    patMiddlename: data.patMiddlename || "",
    patBirthdate: data.patBirthdate || "",
  };
}
