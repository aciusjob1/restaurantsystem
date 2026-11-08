# City Square Restaurant POS

This repository contains a local-first restaurant management system for City Square Restaurant. It is designed to continue operating without internet, while synchronizing to the cloud when connectivity is available.

## Architecture

- Local-first POS with PostgreSQL and a dedicated local server
- Android waiter app with offline/local SQLite queue
- Web cashier and manager dashboards in React + TypeScript
- Thermal printer service for kitchen, bar, and receipt jobs
- Cloud sync and reporting layer
- Docker Compose for local deployment

## Included modules

- Database schema for POS, inventory, payments, reports, sync, and audit trails
- NestJS backend with auth, orders, payments, reports, printers, and sync endpoints
- React cashier dashboard
- React manager dashboard
- Waiter Android app skeleton
- Printer worker service for ESC/POS queue processing
- Dockerized local environment

## Quick start

```bash
docker compose up --build
```

Then open:

- Cashier app: http://localhost:5173
- Manager app: http://localhost:5174
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

## Default credentials

- Email: admin@citysquare.local
- Password: admin123

## Repository layout

```text
city-square-pos/
├── backend/
├── database/
├── frontend/
├── mobile/
├── print-service/
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Business priorities

- Local operation continues when internet is unavailable
- Orders and payments are auditable and protected from silent data loss
- Kitchen and bar printers operate on the private LAN only
- Financial data is protected by immutable audit logs
- Waiter accountability and daily reconciliation are built into the design
