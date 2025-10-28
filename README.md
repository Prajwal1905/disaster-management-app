# 🌍 Disaster Management System

An intelligent full-stack web application designed to improve **disaster preparedness, response, and coordination**.  
It enables citizens, volunteers, and authorities to share real-time reports, locate shelters, and receive alerts — even in offline mode.

---

## ⚙️ Tech Stack

**Frontend:** React.js, Tailwind CSS, Leaflet.js, i18Next  
**Backend:** Flask (Python), MongoDB, Socket.io  
**Other Integrations:** Twilio (SMS alerts), PWA Offline Mode, IndexedDB, Geolocation API

---

## 🚀 Features

### 🧑‍💼 Admin & Authority
- Manage live disaster reports (approve, resolve, mark as fake)
- View real-time heatmaps and filtered risk graphs
- Manage shelters (add/edit/delete/update capacity)
- Send SMS/WhatsApp alerts using Twilio

### 👥 Citizen
- Report hazards with image, GPS, and category (works offline)
- Auto-sync when back online using IndexedDB
- Find nearest shelters with directions & distance
- View live community alerts and chatbot responses

### 🤖 Chatbot
- Supports multilingual queries (English, Hindi, Marathi)
- Finds nearest shelters and checks available capacity
- Provides instant disaster FAQs and safety tips

### 🗺️ Map & Visualization
- Interactive Leaflet map with pins, clustering, and heatmaps
- Filters by disaster type, district, or date range
- View shelter capacity, distance, and facility details

---

## 🛠️ Project Structure

