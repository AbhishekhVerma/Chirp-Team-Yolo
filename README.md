# Chirp

A local-first, highly experimental social discovery app built for the weekend hackathon. 

Chirp helps you find out what is happening around you right now, even if you drop off the grid. We bypassed traditional accounts, ignored standard API limitations, and used raw browser hardware features to build a sensory, offline-capable experience.

## Features

* **Offline-First PWA:** Installable directly from Safari or Chrome. The app caches social feeds locally, so if you lose signal in a crowded basement venue, you still know where your friends are.
* **Audio-Chirp Mesh Networking:** No cell service? No problem. Share your saved spots physically using our custom FSK audio modem. Your phone transmits a high-frequency chirp, and your friend's microphone decodes it offline.
* **AR Magic Window:** Look through your phone's camera to see nearby spots hovering in your physical space, mapped using raw gyroscope and compass data.
* **Generative Soundscapes:** Connects to your GPS speed and location type to procedurally synthesize ambient background drones via the Web Audio API. 
* **Frictionless Sync:** Uses a Magic Handle system backed by Vercel KV. Just type a name, and your data syncs securely across devices when you regain connection.

## Tech Stack

* React + Vite (PWA)
* Tailwind CSS (Glassmorphic UI)
* Vercel KV (Redis)
* HTML5 Web Audio API (FSK Modems & Synths)
* WebRTC / MediaDevices API (AR Camera & QR)
* Leaflet + OpenStreetMap

## Run Locally

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`

To test the Audio Chirps, open the app on two different devices (or two browser windows), click "Listen" on one, and "Chirp" on the other!
