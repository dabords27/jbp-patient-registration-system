import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface ModalProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ message, type, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div className="bg-white w-96 rounded-2xl shadow-2xl p-6 text-center animate-fadeIn">
        <div className="flex justify-center mb-4">
          {type === "success" ? (
            <CheckCircle className="w-16 h-16 text-green-500" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500" />
          )}
        </div>

        <h2 className="text-lg font-bold mb-2">
          {type === "success" ? "Success" : "Error"}
        </h2>

        <p className="text-gray-600 mb-6">{message}</p>

        <button
          onClick={onClose}
          className={`px-6 py-2 rounded-lg text-white font-semibold ${
            type === "success"
              ? "bg-green-500 hover:bg-green-600"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default Modal;
