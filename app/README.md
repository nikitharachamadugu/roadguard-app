# RoadGuard Bengaluru • BBMP & Karnataka Road Safety & Hazard Radar

An intelligent, mobile-friendly road safety application customized specifically for **Bengaluru (Bangalore), Karnataka**, featuring AI pothole detection, road blockage monitoring (BWSSB sewage drilling, Namma Metro construction, BESCOM cable trenches), **Google Maps** integration, **audio & haptic proximity buzz alerts**, and direct **BBMP Mayor & civic grievance escalation**.

---

## 🌟 Bengaluru & Karnataka Features

### 1. 🔊 Pothole Proximity Buzz & Haptic Alert (Audio Radar)
- **Web Audio API Synthesizer**: Produces a distinct double-frequency audio warning buzzer tone (340 Hz rapid modulation) when approaching an active pothole or road hazard (no external audio files required).
- **Physical Phone Haptic Vibration**: Vibrates the user's phone (`navigator.vibrate([160, 80, 160])`) on mobile devices.
- **Proximity Geofence Radar**: Continuously monitors the user's live position using `navigator.geolocation.watchPosition` and triggers the buzzer and floating HUD alert when within **50–90 meters** of a reported road hazard.
- **Test Buzz Button**: Easily test the buzzer and phone vibration directly from the top header!

### 2. 🗺️ Google Maps Location Integration
- **Direct Google Maps Sync**: 1-click button to open and verify the location directly on Google Maps.
- **Paste & Parse Google Maps Links**: Paste any Google Maps share link or coordinates (e.g., `https://maps.google.com/?q=12.9176,77.6237`), and the app automatically parses coordinates and syncs the pin.
- **Accurate Geocoding**: Address lookup with Bengaluru bias across BBMP zones (Mahadevapura, Bommanahalli, East Zone, South Zone, Central Zone, West Zone, Yelahanka, RR Nagar).

### 3. 🚧 Road Blockages & Civic Works Tracking
In addition to potholes, citizens and inspectors can report:
- 🕳️ **Potholes / Broken Asphalt Craters**
- 🚧 **BWSSB Sewage Pipeline Drilling & Excavation Trenches**
- 🏗️ **BMRCL Namma Metro Construction Lane Blockages**
- ⚡ **BESCOM Underground Electrical Cable Dug-up Roads**
- 🌊 **Monsoon Water-logging & Inundation**
- 🛣️ **BBMP White-topping & Road Resurfacing**

### 4. 🏛️ Mayor & BBMP Civic Escalation Directory
- **Direct Official Helplines**:
  - **BBMP 24x7 Sahaaya Control Room**: `1533` / `080-22660000`
  - **BBMP WhatsApp Grievance**: `+91 94806 85700`
  - **Bangalore Traffic Police (BTP)**: `1095` / `080-22943030` / WhatsApp: `+91 94808 01000`
  - **BWSSB Helpline**: `1916` / `080-22238888` / WhatsApp: `+91 87622 28888`
  - **BESCOM Helpline**: `1912` / WhatsApp: `+91 94498 18123`
  - **Karnataka PWD Portal**: [kpwd.karnataka.gov.in](https://kpwd.karnataka.gov.in)
- **1-Click WhatsApp Grievance Dispatcher**: Opens WhatsApp with pre-filled complaint text to BBMP Sahaaya with exact Google Maps link, coordinates, ward info, and photo.
- **1-Click Twitter Escalator**: Tweets directly to `@BBMPCOMM`, `@blrcitytraffic`, and `@DKShivakumar`.

---

## 🚀 Running the Application

The server is currently running. You can open it in your browser:

- **Desktop**: [http://127.0.0.1:5000](http://127.0.0.1:5000)
- **Mobile** (on the same local network): `http://<your-computer-ip>:5000`

To start or restart the server manually:

```powershell
python -m app.app
```

---

## 📁 Project Architecture

```
app/
├── app.py                  # Flask server with Bengaluru civic contacts & REST API
├── detector.py             # Computer vision pothole detection engine
├── models.py               # SQLite database with Bengaluru seed data & categories (potholes.db)
├── requirements.txt        # Dependencies
├── README.md               # Documentation
├── templates/
│   └── index.html          # Responsive single-page app with Mayor & BBMP action tab
└── static/
    ├── css/
    │   └── style.css       # Design system, proximity buzz banner & mobile navigation
    ├── js/
    │   └── app.js          # Proximity buzz sound, vibration, Google Maps sync, Leaflet
    ├── samples/            # Bengaluru test spots (Silk Board, Whitefield, Vidhana Soudha)
    └── uploads/            # Citizen uploads & AI-annotated hazard scans
```
