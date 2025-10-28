// src/config.js
const isAndroid = /Android/i.test(navigator.userAgent);
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isAndroid ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000");
