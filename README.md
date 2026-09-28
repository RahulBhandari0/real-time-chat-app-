# 💬 Real-Time Chat Application

A full-stack real-time web application built with **Node.js**, **Express**, **Socket.IO**, and **JWT Authentication**. It features real-time multi-room messaging, active online user tracking, typing status indicators, direct 1-on-1 private messaging, and auto-destructing VIP messages.

---

## 🚀 Live Demo

🔗 **Live Deployment:** [View Live App](https://real-time-chat-app-8uu0.onrender.com) 

---

## ✨ Features

- **🔑 User Authentication:** Secure Login and Registration using JWT (JSON Web Tokens).
- **⚡ Real-Time Communication:** Instant messaging powered by WebSockets (Socket.IO).
- **🏠 Chat Rooms & Channels:** Multi-room support (General, Tech, Random, etc.).
- **✍️ Live Typing Indicators:** See when other users are typing in real time.
- **🟢 Active Status Tracking:** Live tracking of online/offline users.
- **📩 Direct Messaging (DMs):** Private 1-on-1 messaging capabilities.
- **⏱️ Auto-Destructing VIP Messages:** Timed messages that automatically erase after being read.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Socket.IO Client
- **Backend:** Node.js, Express.js
- **Real-Time Data:** Socket.IO
- **Security:** JSON Web Tokens (JWT), Bcrypt.js
- **Database:** Custom JSON datastore (`database.json`)
- **Deployment:** Render

---

## ⚙️ Local Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/RahulBhandari0/real-time-chat-app-.git](https://github.com/RahulBhandari0/real-time-chat-app-.git)
   cd real-time-chat-app-
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add:
   ```env
   PORT=3000
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Run the server:**
   ```bash
   npm start
   ```

5. **Access the application:**
   Open `http://localhost:3000` in your browser.