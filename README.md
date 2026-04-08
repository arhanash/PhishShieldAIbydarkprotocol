# 🛡️ PhishShield AI

<div align="center">
  <p><strong>Real-Time Hybrid Phishing Detection System</strong></p>
</div>

## 🚀 The Problem

Traditional phishing guards rely exclusively on static blacklists. However, modern cybercriminals easily bypass these by using novel URLs, spelling variations, and structural deception (typosquatting, hidden special characters). 

## 💡 Our Solution

**PhishShield AI** is a lightweight, real-time browser extension backed by a local AI engine that instantly scans URLs and webpage text *before* the user interacts with the payload. 

It is designed with a **Hybrid Detection Architecture** ensuring zero-day resilience and absolute transparency.

### 🧠 Hybrid Detection Architecture

Our python backend processes incoming URLs and Suspicious Text through two simultaneous engines:

1. **Rule-Based Engine (60% Weight):** Acts as the rapid response layer. Instantly catches obvious red flags such as excessive URL length, hidden `@` symbol obfuscation, missing secure `https://` sockets, or urgent text keywords (like 'verify', 'update', or 'bank').
2. **Machine Learning Layer (40% Weight):** An integrated `scikit-learn` Machine Learning model analyzes numerical features of the target structure to generate a probability distribution against unseen zero-day phishing structural patterns. 

An internal **Risk Scorer** aggregates these results and returns a quantifiable threat score (0-100) mapped to **Safe**, **Suspicious**, or **Dangerous**.

## 🎯 Our "Killer Feature": Explainability

While most security tools exist as a frustrating "magic black box" blocking users without context, PhishShield AI is fundamentally explainable. Detections are instantly translated into simple, human-readable explanations in the extension UI, actively educating the user on the specific tactics attackers are trying to exploit.

---

## 🛠️ Tech Stack

- **Backend AI Engine:** Python, FastAPI, Uvicorn, Scikit-learn, Numpy
- **Frontend Extension:** Vanilla HTML/JS, Dynamic CSS Theming, Chrome Web Extension APIs

---

## 💻 How to Run Locally

If you'd like to test the PhishShield AI Engine on your own machine, follow these instructions:

### 1. Launch the AI Backend Server
1. Clone this repository.
2. Navigate into the `backend/` directory.
3. Windows users can just double-click **`start_backend.bat`**. 
   *(Alternatively from bash: run `pip install -r requirements.txt` followed by `uvicorn main:app --reload`)*.
4. Keep the terminal running. The AI is now listening on `http://127.0.0.1:8000`.

### 2. Install the Browser Extension
1. Open your Chromium browser (Chrome/Edge/Brave/Arc).
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the root directory containing the `manifest.json`.
5. Pin the 🛡️ PhishShield AI extension to your browser toolbar!

### 3. Test the Threat Detection
Click on the extension to open the UI dashboard. Select the "Scan Text" tab and paste this mock threat exactly as written:
> *"URGENT: Your secure bank login needs an update immediately. Verify your account at http://secure-login-update.xyz/@fake"*

---

## 👨‍💻 Meet Team Dark Protocol

- **[ARHAN ASHRAF](https://github.com/arhanash)** *(Team Lead)*
- **[PETER JJJO MANAVALAN](https://github.com/Petezzzz)**
- **[ARJUN ANIL](https://github.com/arjun669)**
- **[MOHAMMED FERIL COTTICOLLAN](https://github.com/muhammedferil)**
- **[ELIJAH AJITH](https://github.com/ELIJAH-bit-dev/ea1867)**

<br>
<div align="center">
  <p>Built with ❤️ by Team Dark Protocol</p>
</div>
