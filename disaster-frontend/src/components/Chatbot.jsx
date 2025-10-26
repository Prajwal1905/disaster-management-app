import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Language dictionary
const LANG = {
  en: {
    greeting1:
      "👋 Hi! I can help you with shelters, alerts, refugee help, volunteers, directions, and emergency contacts.",
    greeting2: "Try asking one of these or use SOS below 👇",
    placeholder: "Ask about shelters, hospitals...",
    sos: "🚨 SOS",
    emergency: "📞 Emergency",
    shareLocation: "📍 Share",
    quickQuestions: [
      "Find nearest shelter",
      "Recent alerts",
      "Nearby alerts",
      "Volunteer opportunities",
      "Refugee Assistant Form",
      "Apply for shelter",
      "Emergency contacts",
    ],
    sosPopupTitle: "🚨 SOS Details",
    name: "Name (optional)",
    contact: "Contact Number (optional)",
    cancel: "Cancel",
    send: "Send SOS",
    sending: "Sending…",
    sosSent: "SOS sent to Superadmin",
    sosFailed: "Failed to send SOS",
    locationShared: "Location shared",
  },
  hi: {
    greeting1:
      "👋 नमस्ते! मैं आपको आश्रय, अलर्ट, शरणार्थी सहायता, स्वयंसेवक, दिशानिर्देश और आपातकालीन संपर्क में मदद कर सकता हूँ।",
    greeting2: "इनमें से किसी एक को आज़माएँ या नीचे SOS का उपयोग करें 👇",
    placeholder: "आश्रयों, अस्पतालों के बारे में पूछें...",
    sos: "🚨 SOS",
    emergency: "📞 आपातकालीन",
    shareLocation: "📍 स्थान साझा करें",
    quickQuestions: [
      "निकटतम आश्रय खोजें",
      "हाल ही के अलर्ट",
      "पास के अलर्ट",
      "स्वयंसेवक अवसर",
      "शरणार्थी सहायता फॉर्म",
      "आश्रय के लिए आवेदन",
      "आपातकालीन संपर्क",
    ],
    sosPopupTitle: "🚨 SOS विवरण",
    name: "नाम (वैकल्पिक)",
    contact: "संपर्क नंबर (वैकल्पिक)",
    cancel: "रद्द करें",
    send: "SOS भेजें",
    sending: "भेजा जा रहा…",
    sosSent: "SOS सुपरएडमिन को भेजा गया",
    sosFailed: "SOS भेजने में विफल",
    locationShared: "स्थान साझा किया गया",
  },
};

const Chatbot = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [language, setLanguage] = useState("en"); // "en" or "hi"
  const scrollRef = useRef();
  const [showSosForm, setShowSosForm] = useState(false);
  const [sosForm, setSosForm] = useState({ name: "", phone: "" });
  const [sendingSOS, setSendingSOS] = useState(false);

  const emergencyContacts = [
    { name: "🚓 Police", phone: "100" },
    { name: "🚒 Fire Department", phone: "101" },
    { name: "🚑 Ambulance", phone: "102" },
    { name: "🟢 NDRF (Disaster Response)", phone: "1078" },
    { name: "🙋 Help Assistant", phone: "1800-123-456" },
  ];

  useEffect(() => {
    setMessages([
      { sender: "bot", text: LANG[language].greeting1 },
      { sender: "bot", text: LANG[language].greeting2 },
    ]);
  }, [language]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Voice recognition not supported in this browser");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = language === "en" ? "en-IN" : "hi-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice input error");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };
    recognition.start();
  };

  const getUserLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject("Geolocation not supported");
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err.message)
      );
    });

  const sendMessage = async (msg = input) => {
    if (!msg.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text: msg }]);
    setInput("");

    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes("volunteer")) return botReplyNavigate("/volunteer");
    if (lowerMsg.includes("shelter application"))
      return botReplyNavigate("/shelter-application");
    if (lowerMsg.includes("nearest shelter") || lowerMsg.includes("nearby shelter"))
      return botReplyNavigate("/shelters");
    if (lowerMsg.includes("emergency")) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text:
            language === "en"
              ? "📞 Here are important emergency contacts:"
              : "📞 महत्वपूर्ण आपातकालीन संपर्क:",
          items: emergencyContacts,
        },
      ]);
      return;
    }
    if (lowerMsg.includes("refugee")) return botReplyNavigate("/refugee");

    try {
      const userLoc = await getUserLocation();
      const res = await fetch("http://localhost:5000/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          lat: userLoc.lat,
          lng: userLoc.lng,
          lang: language,
        }),
      });
      const data = await res.json();
      botReply(data.reply, data.items, data.routeLink);
    } catch {
      botReply(
        language === "en"
          ? "⚠ Unable to fetch response."
          : "⚠ उत्तर प्राप्त करने में असमर्थ।"
      );
      toast.error(
        language === "en"
          ? "Could not reach chatbot service"
          : "चैटबोट सेवा तक पहुँच नहीं सकी"
      );
    }
  };

  // Unified navigation helper
  const botReplyNavigate = (path) => {
    botReply(
      language === "en" ? "Opening page..." : "पृष्ठ खोल रहा है..."
    );
    navigate(path);
  };

  const handleSosSubmit = async () => {
    try {
      if (!navigator.onLine) {
        toast.error(
          language === "en"
            ? "No internet. SOS not sent."
            : "कोई इंटरनेट नहीं। SOS भेजा नहीं गया।"
        );
        return;
      }

      setSendingSOS(true);
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const geoData = await geoRes.json();
      const address = geoData.display_name || "Unknown";

      const sosPayload = {
        name: sosForm.name || "Unknown User",
        contact: sosForm.phone || "N/A",
        description: "SOS emergency",
        latitude: lat,
        longitude: lng,
        location_text: address,
        severity: "High",
        status: "live",
        timestamp: new Date().toISOString(),
      };

      const req = fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sosPayload),
      });

      await toast.promise(req, {
        loading: LANG[language].sending,
        success: LANG[language].sosSent,
        error: LANG[language].sosFailed,
      });

      setShowSosForm(false);
      botReply(
        `🆘 SOS ${language === "en" ? "sent" : "भेजा गया"}.\n${
          LANG[language].name
        }: ${sosPayload.name}\n${LANG[language].contact}: ${
          sosPayload.contact
        }\nLocation: ${address}`
      );
    } catch (err) {
      console.error("SOS Error:", err);
      toast.error(
        language === "en" ? "Error sending SOS" : "SOS भेजने में त्रुटि"
      );
    } finally {
      setSendingSOS(false);
    }
  };

  const botReply = (text, items = null, routeLink = null) => {
    // Internal navigation for any routeLink starting with "/"
    if (routeLink?.startsWith("/")) {
      navigate(routeLink);
      text = text || (language === "en" ? "Opening page..." : "पृष्ठ खोल रहा है...");
      routeLink = null;
    }
    setMessages((prev) => [...prev, { sender: "bot", text, items, routeLink }]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg max-w-[80%] break-words ${
              msg.sender === "user"
                ? "bg-blue-500 text-white self-end ml-auto"
                : "bg-gray-200 text-black self-start"
            }`}
          >
            <p className="whitespace-pre-line">{msg.text}</p>

            {msg.routeLink === "/api/sos" && (
              <button
                onClick={() => setShowSosForm(true)}
                className="text-red-600 underline text-sm block mt-1"
              >
                🚨 Confirm & Send SOS
              </button>
            )}

            {msg.items && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {msg.items.map((item, i) => {
                  let text = "";
                  let link = null;

                  if (item.phone) {
                    text = `${item.name}: ${item.phone}`;
                    link = `tel:${item.phone}`;
                  } else if (item.name && item.distance_km !== undefined) {
                    text = `${item.name} (${item.distance_km.toFixed(1)} km)`;
                    link =
                      item.location?.lat && item.location?.lng
                        ? `https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}`
                        : null;
                  } else if (item.title && item.location) {
                    text = `${item.title} at ${item.location}`;
                  } else {
                    text = JSON.stringify(item);
                  }

                  return (
                    <div
                      key={i}
                      className="bg-white p-2 border rounded shadow-sm hover:bg-gray-100"
                    >
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline"
                        >
                          {text}
                        </a>
                      ) : (
                        <span>{text}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <div ref={scrollRef}></div>
      </div>

      {/* Quick SOS + Actions */}
      <div className="flex gap-2 p-2 border-t bg-red-50">
        <button
          className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-60"
          onClick={() => setShowSosForm(true)}
          disabled={sendingSOS}
        >
          {LANG[language].sos}
        </button>

        <button
          className="bg-green-600 text-white px-3 py-1 rounded"
          onClick={() =>
            sendMessage(
              language === "en" ? "Emergency contacts" : "आपातकालीन संपर्क"
            )
          }
        >
          {LANG[language].emergency}
        </button>

        <button
          className="bg-gray-600 text-white px-3 py-1 rounded"
          onClick={() =>
            getUserLocation()
              .then((loc) => {
                botReply(
                  `📍 ${
                    language === "en"
                      ? "Location shared"
                      : "स्थान साझा किया गया"
                  }: ${loc.lat}, ${loc.lng}`
                );
                toast.success(LANG[language].locationShared);
              })
              .catch(() =>
                toast.error(
                  language === "en"
                    ? "Couldn't fetch location"
                    : "स्थान प्राप्त नहीं कर सका"
                )
              )
          }
        >
          {LANG[language].shareLocation}
        </button>
      </div>

      {/* Quick Question Chips */}
      <div className="flex flex-wrap gap-2 p-2 border-t bg-gray-100">
        {LANG[language].quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(q)}
            className="px-3 py-1 bg-gray-200 text-xs rounded-full hover:bg-gray-300"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1 p-1 border-t bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={LANG[language].placeholder}
          className="flex-1 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleVoiceInput}
          className={`px-3 rounded ${listening ? "bg-red-400" : "bg-gray-200"}`}
        >
          🎙
        </button>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-1 py-1 border rounded text-xs sm:text-sm"
        >
          <option value="en">EN</option>
          <option value="hi">HI</option>
        </select>

        <button
          onClick={() => sendMessage()}
          className="bg-blue-600 text-white p-2 sm:px-2 sm:py-1 rounded flex-shrink-0"
        >
          ➤
        </button>
      </div>

      {/* 🚨 SOS Popup */}
      {showSosForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-3">
              {LANG[language].sosPopupTitle}
            </h2>

            <input
              type="text"
              placeholder={LANG[language].name}
              value={sosForm.name}
              onChange={(e) => setSosForm({ ...sosForm, name: e.target.value })}
              className="w-full border p-2 mb-2 rounded"
            />

            <input
              type="text"
              placeholder={LANG[language].contact}
              value={sosForm.phone}
              onChange={(e) =>
                setSosForm({ ...sosForm, phone: e.target.value })
              }
              className="w-full border p-2 mb-2 rounded"
            />

            <div className="flex justify-end gap-2 mt-3">
              <button
                className="px-3 py-1 bg-gray-400 text-white rounded"
                onClick={() => setShowSosForm(false)}
                disabled={sendingSOS}
              >
                {LANG[language].cancel}
              </button>
              <button
                className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-60"
                onClick={handleSosSubmit}
                disabled={sendingSOS}
              >
                {sendingSOS ? LANG[language].sending : LANG[language].send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
