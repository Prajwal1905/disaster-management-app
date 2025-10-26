import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react"; 
import Chatbot from "./Chatbot"; 

const ChatbotButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[600px] bg-white shadow-2xl rounded-2xl flex flex-col animate-slide-up">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center rounded-t-2xl">
            <span className="font-semibold">Disaster Help Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:text-gray-200 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto">
            <Chatbot />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotButton;
