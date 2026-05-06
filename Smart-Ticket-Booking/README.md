# Smart Multi-Service Ticket Booking System

A production-ready full-stack platform with an AI chatbot for booking bus, train, movie, event, and flight tickets.

## Architecture

```text
Smart-Ticket-Booking/
|-- backend/          # Node.js + Express + MongoDB
|-- frontend/         # React + Vite + Tailwind CSS
|-- chatbot-service/  # Python FastAPI NLP Engine
`-- docs/             # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB local or Atlas

### 1. Backend Setup

```bash
cd backend
npm install
npm run seed
npm run dev
```

Demo credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartticket.com | Admin@123 |
| Company | redbus@example.com | Company@123 |

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Chatbot Service Setup

```bash
cd chatbot-service
pip install -r requirements.txt
python main.py
```

API docs: `http://localhost:8000/docs`

## API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/services/search | Search services |
| GET | /api/services/:id | Get service details |
| POST | /api/services | Create service |
| PUT | /api/services/:id | Update service |
| DELETE | /api/services/:id | Delete service |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/bookings | Create booking |
| GET | /api/bookings/my | My bookings |
| PUT | /api/bookings/:id/cancel | Cancel booking |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Admin stats |
| GET | /api/admin/companies | All companies |
| PUT | /api/admin/companies/:id/approve | Approve company |

### Chatbot

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /chat | Process NLP message |

## Chatbot Examples

```text
Book 2 bus tickets from Salem to Chennai tomorrow
Show movies today in Chennai
Find flights to Mumbai next week
Book 3 event tickets for this weekend
```

## UI Pages

- `/` - Home with search
- `/login` - Login
- `/register` - Register
- `/search` - Search results
- `/book/:id` - Booking page
- `/dashboard` - User dashboard
- `/bookings` - Booking history
- `/admin` - Admin dashboard
- `/company` - Company dashboard
- `/company/services` - Manage services

## Role-Based Access

| Feature | Admin | Company | User |
|---------|-------|---------|------|
| Approve companies | Yes | No | No |
| Create services | No | Yes | No |
| Book tickets | No | No | Yes |
| View all bookings | Yes | Yes* | Yes* |
| AI chatbot | Yes | Yes | Yes |

\* Own bookings only
