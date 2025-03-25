# SchedLite 🗓️ (WIP)

SchedLite is an open-source scheduling backend built with TypeScript, Express, and PostgreSQL.

✨ It’s designed to be:

    🪶 Lightweight — no bloated dashboards, just what you need

    🧠 Easy to use — minimal setup, clear routes, and simple integration

    🔓 Self-hosted — you stay in control of your data and deployment

    🆓 Free — open-source under the MIT license, ready for anyone to use or extend
  

> ⚠️ This project is in early development. It's not ready for production yet — but it’s getting there, and contributors are very welcome!


## 💬 Join the SchedLite Discord

Have ideas, questions, or want to contribute?  
Join the conversation on our Discord server! https://discord.gg/F9WHHRrqbZ

---

## ✅ Current Features (so far)

- 🔐 Register/login system with JWT authentication
- 🛡️ Middleware to protect routes
- 🧪 Basic tests using Vitest + Supertest
- 🌱 PostgreSQL + Prisma setup
- 🧱 Express + TypeScript architecture

---

## 🚧 In Progress / Upcoming

- 🗓️ Calendar availability and booking routes
- 🔁 Stripe integration (for booking payments)
- 📅 Google Calendar + Zoom sync
- 🧩 Multi-tenant support for self-hosted client scheduling
- 📖 Admin dashboard or embeddable frontend (eventually)

---

## 🔧 Local Development

```bash
# Clone the repo
git clone https://github.com/robjsnow/schedlite.git
cd schedlite

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Then edit .env with your own database connection + JWT secret

# Run development server
npm run dev
