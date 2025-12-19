# 🎙️ Voice-to-Text Desktop App (Tauri + Deepgram)

A cross-platform **voice-to-text desktop application** built with **Tauri**, **React**, and **Deepgram**.  
This project is a functional clone of **Wispr Flow**, focused on delivering a smooth, real-time push-to-talk transcription experience rather than pixel-perfect UI.

---

## 🚀 Project Overview

This application allows users to:
- Hold a key or button to speak (push-to-talk)
- Capture microphone audio with low latency
- Stream audio to Deepgram for real-time speech recognition
- View interim and final transcriptions as they speak
- Copy transcribed text to the system clipboard

The goal of this project is to demonstrate **practical AI-powered desktop application development**, clean architecture, and real-time streaming integration using modern tools.

---

## 🧠 Architecture & Design

### High-Level Data Flow

 **Microphone** – Captures raw audio from the system mic  
**AudioWorklet (16kHz PCM16)** – Processes and downsamples audio off the main thread  
**Tauri IPC (invoke)** – Streams audio chunks to the backend  
**Rust Backend** – Manages WebSocket lifecycle and authentication  
**WebSocket → Deepgram** – Sends audio and receives transcription  
**Transcription Events** – Emitted back to the frontend  
**React UI** – Displays interim and final text in real time

### Key Design Decisions

#### 🎧 Audio Capture (AudioWorklet)
- Uses **AudioWorklet** instead of `ScriptProcessorNode`
- Runs off the main thread for smoother audio and lower latency
- Downsamples mic input to **16kHz PCM16**, which Deepgram expects

#### 🦀 Rust Backend (Tauri)
- Maintains a persistent WebSocket connection to Deepgram
- Streams audio chunks and receives transcription events
- Emits transcription events back to the frontend using Tauri events
- Keeps the API key **secure on the backend** (never exposed to frontend JS)

#### ⚛️ Frontend (React)
- Simple UI focused on usability and clarity
- Push-to-talk via button or **Space key**
- Displays **interim** and **final** transcripts separately
- Clipboard integration via Tauri plugin

---

## 🧩 Technology Stack

- **Tauri v2** – Cross-platform desktop framework
- **React + Vite** – Frontend UI
- **Rust** – Native backend and WebSocket handling
- **AudioWorklet** – High-performance audio capture
- **Deepgram API** – Real-time speech-to-text
- **WebSocket (tokio-tungstenite)** – Low-latency streaming
- **Clipboard Manager Plugin** – Copy transcriptions to clipboard

---

## ✨ Features Implemented

✔ Push-to-Talk voice input (button + Space key)  
✔ Microphone permission handling  
✔ Real-time transcription (interim + final results)  
✔ Low-latency audio streaming  
✔ Visual recording state feedback  
✔ Clipboard copy support  
✔ Graceful error handling (permissions, API, network)

---

## 🛠️ Setup & Installation

### 1️⃣ Prerequisites

Make sure you have:

- **Node.js** (v18+ recommended)
- **Rust** (stable)
- **Tauri CLI**
- A **Deepgram API key**

Install Tauri CLI if needed:
```bash
cargo install tauri-cli
```
### 2️⃣ Clone & Install
```bash
git clone <your-repo-url>
cd wispr-tauri-deepgram
npm install
```

### 3️⃣ Set Deepgram API Key (Required)

⚠️ The API key is read only by the Rust backend.

Windows (PowerShell)
```bash
$env:DEEPGRAM_API_KEY="YOUR_DEEPGRAM_API_KEY"
npm run tauri:dev
```



### 🔐 Do not commit your API key.
If you use environment files, add .env.local to .gitignore.

▶️ Running the App
```bash
npm run tauri:dev
```

### ⚠️ Important:
This app must be run inside the Tauri desktop window, not directly in a browser tab.

## 🧪 How to Use

1. Launch the application  
2. Click **Hold to Talk** or press and hold the **Space bar**  
3. Speak into your microphone  
4. Watch the transcription appear in real time  
5. Release to stop recording  
6. Click **Copy** to copy the text to the clipboard  

---

## 📁 Project Structure

```bash
src/
 ├─ audio/
 │   └─ workletRecorder.ts
 ├─ worklets/
 │   └─ pcm16-processor.js
 ├─ services/
 │   └─ tauriBridge.ts
 ├─ App.tsx

src-tauri/
 ├─ src/
 │   ├─ main.rs
 │   └─ deepgram.rs
 ├─ capabilities/
 │   └─ default.json
 └─ tauri.conf.json


```

## ⚠️ Known Limitations

- Requires an active **Deepgram API key** (billing required by Deepgram)
- Voice activity sensitivity depends on microphone quality and background noise
- No advanced text editing (intentional per assignment scope)
- Designed as a **prototype**, not production-hardened

---

## 📌 Why Tauri (vs Electron)

- Smaller bundle size  
- Lower memory usage  
- Native system access via **Rust**  
- Better performance for real-time workloads  

---

## 🎥 Demo Video

A short demo video is included showing:

- Application startup  
- Push-to-talk recording  
- Live transcription  
- Copy-to-clipboard workflow  

---

## 🧠 What This Demonstrates

- Real-time streaming architecture  
- Cross-platform desktop development  
- Audio processing fundamentals  
- Secure API handling  
- Clean separation of concerns  
- Practical AI integration  

---

## 📬 Final Notes

This project prioritizes **functionality, clarity, and architecture**, aligning with real-world product development rather than visual polish.

Thanks for reviewing!
