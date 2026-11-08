# City Square Restaurant POS

A desktop-first, local-first restaurant point-of-sale and management system for City Square Restaurant. The project includes a cashier interface, manager dashboard, NestJS API, PostgreSQL database, waiter accountability, and printer/synchronization foundations.

> **Project status:** This repository contains an implementation foundation that is still being developed. Verify the workflows and configure security, backups, printers, and payment procedures before using it for live restaurant transactions.

## Features and architecture

- Desktop shell built with Electron; it opens the cashier interface.
- Cashier and manager web interfaces built with React and TypeScript.
- NestJS API and PostgreSQL database, deployable on the restaurant LAN.
- Staff roles: admin, manager, cashier, and waiter.
- Waiter profiles and waiter-attributed orders for accountability and reporting.
- Order, payment, catalog, reporting, printer, and synchronization API foundations.
- Local-first architecture: restaurant operations are intended to use the local server; cloud access is not required for LAN operation.

Waiters are first-class users. Orders should retain the waiter responsible for the original sale, and management reports are designed to separate sales from payments collected and outstanding balances.

## Repository layout

```text
restaurantsystem/
├── backend/                 NestJS API
├── database/init/           PostgreSQL schema and seed scripts
├── desktop/                 Electron desktop shell
├── frontend/cashier/        Cashier POS interface
├── frontend/manager/        Manager dashboard
├── mobile/waiter-android/   Android waiter app starter
├── print-service/           Printer service starter
├── docker-compose.yml       Local development services
└── README.md
```

## Download the project from GitHub

The repository is private, so sign in to GitHub with an account that has access to `aciusjob1/restaurantsystem`.

### Option 1: Download a ZIP

1. Open [github.com/aciusjob1/restaurantsystem](https://github.com/aciusjob1/restaurantsystem).
2. Select **Code** → **Download ZIP**.
3. Extract the ZIP to a folder on the computer.
4. Open a terminal in the extracted `restaurantsystem` folder and continue with setup below.

### Option 2: Clone with Git

Install Git, then run:

```bash
git clone https://github.com/aciusjob1/restaurantsystem.git
cd restaurantsystem
```

If prompted, authenticate with a GitHub account that has access. To update a clone later:

```bash
git pull
```

## Requirements

For the Docker-based local development setup:

- Windows, macOS, or Linux desktop
- Git (for cloning)
- Docker Desktop on Windows/macOS, or Docker Engine and the Compose plugin on Linux
- Node.js and npm for running the Electron desktop shell

For the desktop shell, use a current Node.js LTS release compatible with the Electron dependency in `desktop/package.json`. Docker must be running before launching the desktop application.

## Set up and run locally

### 1. Start the API, database, and web interfaces

From the repository root, run:

```bash
docker compose up --build
```

The first run downloads the container images, installs dependencies, initializes PostgreSQL, and starts the services. Leave this terminal running while using the app. To stop the services, press `Ctrl+C`; to stop and remove the containers while preserving the database volume, run:

```bash
docker compose down
```

Service addresses in the provided local configuration:

| Service | Address |
| --- | --- |
| Cashier interface | http://localhost:5173 |
| Manager interface | http://localhost:5174 |
| Backend API health check | http://localhost:3000/health |
| PostgreSQL | localhost:5432 |

### 2. Open the desktop app

In a second terminal, from the repository root:

```bash
cd desktop
npm install
npm run dev
```

The Electron shell loads the cashier interface at `http://localhost:5173` by default. Keep the Docker services running. To use a different cashier URL, set `DESKTOP_APP_URL` before starting Electron.

The current desktop package provides a development/start shell. It does not yet provide a configured, tested installer release for Windows, macOS, or Linux. Use the GitHub ZIP/clone instructions above to obtain the source unless a packaged build is published under the repository's **Releases** page.

### 3. Sign in

The initial admin account is created by the backend using these defaults unless overridden:

- Email: `admin@citysquare.local`
- Password: `admin123`

Change the initial password and set a strong `JWT_SECRET` before any non-development use. Do not expose the development database or API directly to the public internet. The checked-in Compose configuration is for local development and should be hardened before deployment.

## Configuration and data

The backend reads configuration from environment variables, including `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET`. The Compose file supplies local development values. Configure secrets outside source control for real deployments; never commit production passwords or signing keys.

PostgreSQL data is stored in the Compose-managed `postgres_data` volume and survives `docker compose down`. To intentionally remove that database volume and its data, use `docker compose down -v`—this is destructive. Back up the database and test restoration regularly before using real business data.

## Waiter and order workflow

1. A manager or administrator creates staff accounts and waiter profiles.
2. Cashier staff sign into the desktop POS, select the waiter and table/order type, and add menu items.
3. The server validates products and prices, records the order, preserves the waiter association, and queues configured preparation-station print jobs.
4. Payments are recorded against orders; partial payments and outstanding balances are represented separately.
5. Managers review sales, waiter performance, and outstanding amounts through reporting endpoints and the manager interface.

Local drafts in the cashier UI are a recovery aid when the API is unreachable; they are not confirmation that the kitchen received an order. Confirm server acceptance and printer status before relying on a ticket being prepared.

## Development commands

Run a service separately when needed:

```bash
# Backend, after its database is available
cd backend
npm install
npm run start:dev

# Cashier frontend
cd frontend/cashier
npm install
npm run dev

# Manager frontend
cd frontend/manager
npm install
npm run dev
```

## Production and operational cautions

- Use unique staff accounts, strong passwords, and a private LAN.
- Replace development credentials and JWT secrets before deployment.
- Restrict printer access to the restaurant network; do not expose printer ports publicly.
- Configure and test printer models, addresses, backups, and restore procedures on the actual hardware.
- Validate totals, taxes, discount approvals, cancellation authorization, and cash reconciliation before live use.
- Internet/cloud synchronization and physical printer acknowledgement depend on deployment and supported hardware; the repository foundations alone do not guarantee those integrations are operational.

## License and support

See the repository for license information. For setup issues, open an issue in the GitHub repository with the operating system, Docker/Node versions, command run, and relevant error output. Do not include passwords, tokens, or customer/financial data in issue reports.
