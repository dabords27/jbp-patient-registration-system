import React, { useState, useRef, useEffect } from 'react';
import { Camera, User, Loader2, Hospital, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { PatientFormData } from './types';
import { performOCR } from './services/geminiOCR';
import { registerPatient, checkApiStatus } from './services/api';
import Toast from './components/Toast';
import Modal from './components/Modal';


const App: React.FC = () => {
const [showErrors, setShowErrors] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    patLastname: '',
    patFirstname: '',
    patMiddlename: '',
    patBirthdate: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const performCheck = async () => {
    setIsApiOnline(null);
    const online = await checkApiStatus();
    setIsApiOnline(online);
  };

  useEffect(() => {
    performCheck();
    const interval = setInterval(performCheck, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;

  // Name fields: allow letters, space, hyphen, apostrophe only
  if (
    name === "patLastname" ||
    name === "patFirstname" ||
    name === "patMiddlename"
  ) {
    const cleanedValue = value
      .replace(/[^A-Za-z\s'-]/g, "")
      .toUpperCase();
    setFormData(prev => ({ ...prev, [name]: cleanedValue }));
    return;
  }

  // Default behavior for other fields
  setFormData(prev => ({ ...prev, [name]: value }));
};


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsOcrLoading(true);

  try {
    const result = await performOCR(file);

    setFormData({
      patLastname: result.patLastname,
      patFirstname: result.patFirstname,
      patMiddlename: result.patMiddlename,
      patBirthdate: result.patBirthdate,
    });

    setToast({
      message: "Information extracted successfully.",
      type: "success",
    });
  } catch (err) {
    setToast({
      message: "OCR failed. Please try a clearer photo.",
      type: "error",
    });
  } finally {
    setIsOcrLoading(false);
  }
};
const handleBirthdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value.replace(/\D/g, ""); // numbers only

  if (value.length > 8) value = value.slice(0, 8);

  if (value.length >= 5) {
    value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
  } else if (value.length >= 3) {
    value = `${value.slice(0, 2)}/${value.slice(2)}`;
  }

  setFormData(prev => ({
    ...prev,
    patBirthdate: value,
  }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setShowErrors(true);

  const birthdate = formData.patBirthdate.trim();

  if (!formData.patLastname || !formData.patFirstname || !birthdate) {
    setToast({
      message: "Please fill in all required fields.",
      type: "error",
    });
    return;
  }

  let formattedBirthdate = formData.patBirthdate;

  if (/^\d{4}-\d{2}-\d{2}$/.test(formattedBirthdate)) {
    const [year, month, day] = formattedBirthdate.split("-");
    formattedBirthdate = `${month}/${day}/${year}`;
  }

  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/;

  if (!dateRegex.test(formattedBirthdate)) {
    setToast({
      message: "Please enter a valid birthdate.",
      type: "error",
    });
    return;
  }

  // ✅ All validations passed

  setIsLoading(true);

  try {
    const response = await registerPatient({
      ...formData,
      patBirthdate: formattedBirthdate,
    });

    if (response.success) {
      setToast({
        message: response.data?.pkPatientID
          ? `Patient successfully registered. Patient ID: ${response.data.pkPatientID}`
          : "Patient successfully registered.",
        type: "success",
      });
	// setTimeout(() => {
  // setToast(null);
// }, 3000);
  

      setFormData({
        patLastname: "",
        patFirstname: "",
        patMiddlename: "",
        patBirthdate: "",
      });

      setShowErrors(false);
    } else {
      setToast({
        message: response.message || "Registration failed.",
        type: "error",
      });
    }
  } catch {
    setToast({
      message: "Unable to save patient. Please try again.",
      type: "error",
    });
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
  <img
    src="/JBP_LOGO.png"
    alt="DABORDS SYSTEM"
    className="w-10 h-10 rounded-full object-cover"
  />
  <span className="font-bold text-2xl tracking-tight text-blue-800">
    DABORDS SYSTEM
  </span>
</div>

        </div>

        <button
          onClick={performCheck}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isApiOnline === null
              ? 'bg-gray-50 text-gray-400 border-gray-200'
              : isApiOnline
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          {isApiOnline === null ? <Loader2 className="w-3 h-3 animate-spin" /> :
            isApiOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden sm:inline">
            {isApiOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
          {!isApiOnline && isApiOnline !== null && <RefreshCw className="w-3 h-3 ml-1" />}
        </button>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Patient Registration</h1>
            {/*<p className="text-gray-500 text-sm">Secure local registration system.</p>*/}
          </div>

          {/* OCR */}
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isOcrLoading}
              className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isOcrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              Scan Patient ID
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
  LASTNAME <span className="text-red-500">*</span>
</label>

<input
  name="patLastname"
  value={formData.patLastname}
  onChange={handleInputChange}
  className={`w-full px-4 py-2 bg-gray-50 border rounded-lg font-semibold outline-none focus:ring-2
    ${showErrors && !formData.patLastname
      ? "border-red-500 focus:ring-red-500"
      : "border-gray-200 focus:ring-blue-500"
    }`}
/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
  FIRSTNAME <span className="text-red-500">*</span>
</label>

<input
  name="patFirstname"
  value={formData.patFirstname}
  onChange={handleInputChange}
  className={`w-full px-4 py-2 bg-gray-50 border rounded-lg font-semibold outline-none focus:ring-2
    ${showErrors && !formData.patFirstname
      ? "border-red-500 focus:ring-red-500"
      : "border-gray-200 focus:ring-blue-500"
    }`}
/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
  MIDDLENAME <span className="text-red-500"></span>
</label>

              <input
                name="patMiddlename"
                value={formData.patMiddlename}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
  BIRTHDATE <span className="text-red-500">*</span>
</label>

<input
  type="text"
  name="patBirthdate"
  placeholder="MM/DD/YYYY"
  value={formData.patBirthdate}
  onChange={handleBirthdateChange}
  inputMode="numeric"
  className={`w-full px-4 py-2 bg-gray-50 border rounded-lg font-semibold outline-none focus:ring-2
    ${showErrors && !formData.patBirthdate
      ? "border-red-500 focus:ring-red-500"
      : "border-gray-200 focus:ring-blue-500"
    }`}
/>

            </div>

            <button
              type="submit"
              disabled={isLoading || !isApiOnline}
              className={`w-full py-3 rounded-lg font-bold text-white transition ${
                !isApiOnline ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#42b72a] hover:bg-[#36a420]'
              }`}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Register Patient'}
            </button>
          </form>
        </div>
      </main>

      {toast && (
  <Modal
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
  />
)}

    </div>
  );
};

export default App;
