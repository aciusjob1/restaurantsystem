# City Square Restaurant POS

A desktop-first restaurant point-of-sale and management system for City Square Restaurant.

## What this system does

- Local-first transaction processing with PostgreSQL
- Desktop cashier and manager interfaces
- Dedicated waiter role and accountability tracking
- Kitchen/bar print queue handling
- Local network operation when internet fails
- Cloud sync and reporting, without blocking business operations

## Desktop application model

This project is designed as a desktop application shell that runs the restaurant system locally on a restaurant PC. The desktop wrapper loads the cashier and manager interfaces, while the backend and database run locally on the same private network.

## Core roles

- Admin
- Manager
- Cashier
- Waiter

Waiters are treated as first-class users in the system. Each waiter has their own profile, orders retain original waiter ownership, and reports include waiter sales and accountability.

## Project structure

```text
restaurantsystem/
├── backend/
├── database/
├── desktop/
├── frontend/
├── mobile/
├── print-service/
├── docker-compose.yml
├── README.md
└── .gitignore
```

## Run locally

```bash
docker compose up --build
```

To run the desktop shell:

```bash
cd desktop
npm install
npm run dev
```

## Default login

- Email: admin@citysquare.local
- Password: admin123
