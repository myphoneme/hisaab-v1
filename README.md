# Hisaab - Accounting Module

A comprehensive accounting module for managing company business operations and finances. Built with React + Vite for frontend and FastAPI for backend.

## Features

### Core Modules
- **Client Management** - Manage B2B, B2C, B2G, SEZ, Export clients
- **Vendor Management** - Track vendors with TDS applicability
- **Purchase Orders** - Receive and manage POs from clients
- **Invoice Management** - Generate GST-compliant sales/purchase invoices
- **Payment Tracking** - Record receipts and payments with TDS/TCS
- **Ledger & Accounting** - Double-entry bookkeeping with trial balance

### Tax Compliance (India)
- GST calculations (CGST, SGST, IGST based on state)
- TDS deduction and tracking
- TCS collection
- GST return data preparation (GSTR-1, GSTR-3B)
- E-invoicing ready (IRN support)

### Reports
- Dashboard with key metrics
- GST Summary reports
- TDS Summary reports
- Aging reports (Receivables/Payables)
- Trial Balance, P&L, Balance Sheet

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite 5 (Build tool)
- Tailwind CSS v4
- TanStack Query v5 (Server state)
- TanStack Table (Data tables)
- React Router v6
- Zustand (Client state)
- React Hook Form + Zod (Forms)

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy 2.0 (Async)
- PostgreSQL
- Alembic (Migrations)
- Pydantic v2

## Project Structure

```
hisaab/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── ui/         # Base UI (Button, Input, etc.)
│   │   │   └── layout/     # Layout components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── stores/         # Zustand stores
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities
│   └── package.json
│
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   ├── core/           # Config, security
│   │   ├── db/             # Database session
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app
│   ├── alembic/            # Database migrations
│   └── requirements.txt
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 14+

### Backend Setup

1. Create virtual environment:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
copy .env.example .env
# Edit .env with your database credentials
```

4. Create database:
```sql
CREATE DATABASE hisaab;
```

5. Run migrations:
```bash
alembic upgrade head
```

6. Start server:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:3000
The backend API will be available at http://localhost:8000/api/v1/docs

## API Documentation

Once the backend is running, access:
- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## Indian State Codes (for GST)

| Code | State |
|------|-------|
| 01 | Jammu & Kashmir |
| 02 | Himachal Pradesh |
| 03 | Punjab |
| 04 | Chandigarh |
| 05 | Uttarakhand |
| 06 | Haryana |
| 07 | Delhi |
| 08 | Rajasthan |
| 09 | Uttar Pradesh |
| 10 | Bihar |
| 11 | Sikkim |
| 12 | Arunachal Pradesh |
| 13 | Nagaland |
| 14 | Manipur |
| 15 | Mizoram |
| 16 | Tripura |
| 17 | Meghalaya |
| 18 | Assam |
| 19 | West Bengal |
| 20 | Jharkhand |
| 21 | Odisha |
| 22 | Chattisgarh |
| 23 | Madhya Pradesh |
| 24 | Gujarat |
| 27 | Maharashtra |
| 29 | Karnataka |
| 30 | Goa |
| 32 | Kerala |
| 33 | Tamil Nadu |
| 36 | Telangana |
| 37 | Andhra Pradesh |

## License

MIT
