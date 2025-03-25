# SchedLite

**Project Status**: 🚧 *Active Development*  
*SchedLite is currently in active development and not yet production-ready. Contributions, suggestions, and testing are welcome!*

**Community**:  
Join our [Discord server](https://discord.gg/F9WHHRrqbZ) to discuss ideas, ask questions, or contribute to the project.

---

## Overview

SchedLite is a lightweight, self-hosted scheduling application designed for small business owners. Built with **TypeScript**, **Express**, **PostgreSQL**, and **Prisma**, it offers essential scheduling features without unnecessary complexity.

---

## Features

- **User Authentication**: Secure registration and login with JWT authentication.  
- **Calendar Management**: Create and manage availability slots.  
- **Booking System**: Clients can book available slots; includes validation to prevent past or overlapping bookings.  
- **Stripe Integration**: Accept payments for bookings seamlessly.  
- **Google Calendar & Zoom Sync**: Synchronize appointments with Google Calendar and set up Zoom meetings automatically.  
- **Multi-Tenant Support**: Manage multiple businesses or clients within a single instance.  
- **Admin Dashboard**: An intuitive interface for business owners to oversee bookings and availability.  
- **Client Interface**: A user-friendly page for clients to select available times and make bookings.  

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/robjsnow/schedlite.git
cd schedlite

# Install dependencies
npm install

# Create a .env file
cp .env.example .env
# Then fill in your DATABASE_URL and JWT_SECRET

# Run the development server
npm run dev

```

## Contributing

We welcome contributions! If you'd like to fix a bug, suggest a feature, or help shape the roadmap, feel free to open an issue or pull request.

## License

SchedLite is licensed under the [MIT License](LICENSE).

---

Note: This README provides a general overview of the project. For technical documentation or route details, please refer to the source code or future wiki.