export interface OCRResult {
  pat_lastname: string;
  pat_firstname: string;
  pat_middlename: string;
  pat_birthdate: string; // MM/DD/YYYY
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
    pat_lastname: data.pat_lastname || "",
    pat_firstname: data.pat_firstname || "",
    pat_middlename: data.pat_middlename || "",
    pat_birthdate: data.pat_birthdate || "",
  };
}
