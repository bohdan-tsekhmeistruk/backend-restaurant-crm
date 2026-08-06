# Backend Restaurant CRM

![Version](https://img.shields.io/badge/version-0.5.0-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js](https://img.shields.io/badge/Node.js-ESM-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)

REST API backend for a restaurant CRM system, built with **Hono**, **Prisma 7** and **PostgreSQL**.
It provides JWT-based authentication with refresh-token sessions, email verification and password
reset flows, role-based access control (client / admin), and a full product catalog with nested
categories. The database schema is already prepared for the shopping cart and order lifecycle —
these APIs are the next milestones on the [roadmap](#roadmap).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Server](#running-the-server)
- [Usage](#usage)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Account (client)](#account-client)
  - [Catalog (client)](#catalog-client)
  - [Catalog (admin)](#catalog-admin)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [License](#license)
- [Author](#author)

---

## Features

### Implemented

- **Authentication** — register / login with JWT access tokens (~15 min) and rotating refresh
  tokens, delivered via signed `httpOnly` cookies. One active session per user, bound to IP and
  User-Agent.
- **Email verification** — time-limited verification tokens sent by email (Nodemailer + JSON
  templates with `{{placeholder}}` substitution).
- **Password reset** — secure two-step flow: request a code by email, then set a new password
  (strong password policy enforced by Zod).
- **Role-based access control** — `USER` and `ADMIN` roles with dedicated middleware
  (`AuthMiddleware`, `AdminAuthMiddleware`).
- **Product catalog (client)** — paginated search and get-by-id for products and categories.
- **Product catalog (admin)** — full CRUD for products and categories, including nested
  (parent/child) categories. Products referenced by cart or order items are protected from
  deletion.
- **Rate limiting** — 30 requests per 10 minutes on all `/auth/*` routes (`hono-rate-limiter`).
- **Security** — bcrypt password hashing, Zod validation on every input, centralized error
  handling, typed environment config.

### Coming soon (database schema is ready)

- **Shopping cart** — one cart per user, add / update / remove items (`Cart`, `CartItem` models).
- **Orders** — checkout from the cart and a full order lifecycle:
  `PENDING → COOKING → READY_FOR_PICKUP → DELIVERING → DELIVERED → COMPLETED`
  (plus `CANCELLED` / `REFUNDED`).
- **Admin user management** — block / delete users (`UserStatus` enum is already in the schema).

See the full [Roadmap](#roadmap) below.

## Tech Stack

| Layer        | Technology                                            |
| ------------ | ----------------------------------------------------- |
| Runtime      | Node.js (ESM)                                         |
| Language     | TypeScript (strict mode, NodeNext modules)            |
| Framework    | [Hono](https://hono.dev) + `@hono/node-server`        |
| Validation   | [Zod](https://zod.dev) + `@hono/standard-validator`   |
| ORM          | [Prisma 7](https://www.prisma.io) (`@prisma/adapter-pg`) |
| Database     | PostgreSQL                                            |
| Auth         | JWT (`hono/jwt`), signed cookies, bcrypt              |
| Email        | Nodemailer (Gmail SMTP)                               |
| Rate limiting| `hono-rate-limiter`                                   |
| Dev tooling  | `tsx watch`, `tsc`                                    |

## Getting Started

### Prerequisites

- Node.js 20+
- A running PostgreSQL instance
- A Gmail account with an [app password](https://support.google.com/accounts/answer/185833)
  (for sending verification / reset emails)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/<your-username>/backend-restaurant-crm.git
cd backend-restaurant-crm
```

2. Install dependencies:

```bash
npm install
```

3. Create the environment file and fill in all parameters:

```bash
cp .env.example .env
```

See the full list of variables in [Environment Variables](#environment-variables).

### Database Setup

Apply the migrations and generate the Prisma client (output goes to `src/generated/prisma`):

```bash
npx prisma migrate dev
```

Optional — inspect the data in Prisma Studio:

```bash
npx prisma studio
```

### Running the Server

Development mode (hot reload):

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

The API health check is available at [http://localhost:3000/](http://localhost:3000/) —
it should respond with `{ "message": "Api is ready!" }`.

## Usage

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start the dev server with hot reload     |
| `npm run build` | Compile TypeScript into `dist/`          |
| `npm start`     | Run the compiled server from `dist/`     |

Prisma CLI (not wrapped in npm scripts):

```bash
npx prisma migrate dev --name <migration-name>   # create & apply a migration
npx prisma migrate deploy                        # apply migrations in production
npx prisma generate                              # regenerate the client
```

Quick smoke test — register a user (tokens are returned as signed cookies):

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Str0ng!Password",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+380501234567"
  }'
```

Log in and keep the session cookies:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{ "email": "user@example.com", "password": "Str0ng!Password" }'
```

Call a protected endpoint with the saved cookies:

```bash
curl http://localhost:3000/api/v1/account/me -b cookies.txt
```

## API Reference

Base URL: `/api/v1`. Authentication is cookie-based (`accessToken` + `refreshToken`,
signed `httpOnly` cookies) — no `Authorization` header is required.

- **Public** — no authentication needed
- **User** — requires a valid access token (`USER` or `ADMIN` role)
- **Admin** — requires a valid access token with the `ADMIN` role

### Auth

`/api/v1/auth` — rate-limited to 30 requests per 10 minutes.

| Method | Endpoint         | Access | Description                                    |
| ------ | ---------------- | ------ | ---------------------------------------------- |
| POST   | `/register`      | Public | Create a `USER` account, starts a session      |
| POST   | `/login`         | Public | Log in, sets `accessToken` / `refreshToken` cookies |
| POST   | `/refresh-token` | User   | Rotate the access token using the refresh token |

### Account (client)

`/api/v1/account`

| Method | Endpoint                    | Access | Description                                |
| ------ | --------------------------- | ------ | ------------------------------------------ |
| GET    | `/me`                       | User   | Get the current user's profile             |
| PATCH  | `/update`                   | User   | Update `firstName`, `lastName` and/or `phone` |
| POST   | `/send-email-verification`  | User   | Send an email verification token           |
| POST   | `/check-email-verification` | User   | Confirm the email with the received token  |
| POST   | `/send-password-reset`      | Public | Send a password reset code by email        |
| POST   | `/check-password-reset`     | Public | Verify the code and set a new password     |

### Catalog (client)

`/api/v1/categories` and `/api/v1/products` — read-only.

| Method | Endpoint  | Access | Description                          |
| ------ | --------- | ------ | ------------------------------------ |
| GET    | `/search` | User   | Paginated search (categories/products) |
| GET    | `/:id`    | User   | Get a single item by UUID            |

### Catalog (admin)

`/api/v1/admin/categories` and `/api/v1/admin/products`.

| Method | Endpoint  | Access | Description                                  |
| ------ | --------- | ------ | -------------------------------------------- |
| GET    | `/search` | Admin  | Paginated search                             |
| GET    | `/:id`    | Admin  | Get a single item by UUID                    |
| POST   | `/`       | Admin  | Create a category / product                  |
| PATCH  | `/:id`    | Admin  | Update a category / product                  |
| DELETE | `/:id`    | Admin  | Delete (products in a cart/order are protected) |

## Project Structure

```
backend-restaurant-crm/
├── prisma/
│   ├── schema.prisma            # Data models, enums and relations
│   └── migrations/              # Versioned SQL migrations
├── src/
│   ├── index.ts                 # App entry point (server bootstrap)
│   ├── generated/prisma/        # Generated Prisma client
│   ├── lib/                     # Shared cross-cutting concerns
│   │   ├── prisma.ts            # Prisma client singleton (pg adapter)
│   │   ├── error.handler.ts     # Centralized error handling
│   │   ├── templates.service.ts # {{placeholder}} template renderer
│   │   ├── auth/                # Auth middleware + interfaces
│   │   ├── dto/                 # Context / env / template types
│   │   └── templates/           # JSON email templates
│   └── v1/                      # API version 1
│       ├── v1.router.ts         # Version router + auth rate limiting
│       ├── modules/
│       │   ├── auth/            # login / register / refresh-token
│       │   ├── email/           # Nodemailer wrapper (service)
│       │   └── sessions/        # Session persistence (service)
│       ├── client/              # Authenticated client area
│       │   └── modules/
│       │       ├── account/     # Profile, verification, password reset
│       │       ├── categories/  # Read-only catalog
│       │       └── products/    # Read-only catalog
│       └── admin/               # Admin-only area
│           └── modules/
│               ├── categories/  # Full CRUD
│               └── products/    # Full CRUD
├── .env.example                 # Environment template
├── prisma.config.ts             # Prisma config (schema, migrations, DATABASE_URL)
├── package.json
└── tsconfig.json
```

Each module follows a layered pattern:

```mermaid
flowchart LR
    A([HTTP request]) --> B[Router]
    B --> C[Middleware<br/>auth · rate limit · validation]
    C --> D[Controller]
    D --> E[Service]
    E --> F[(Prisma → PostgreSQL)]
```

## Database Schema

The schema is defined in `prisma/schema.prisma` and managed through versioned migrations.
Cart and Order models are already in place ahead of their API implementation.

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o| Cart : owns
    User ||--o{ Order : places
    User ||--o{ EmailVerification : requests
    User ||--o{ PasswordReset : requests
    Cart ||--o{ CartItem : contains
    Order ||--o{ OrderItem : contains
    ProductCategory ||--o{ ProductCategory : "parent / children"
    ProductCategory ||--o{ Product : groups
    Product ||--o{ CartItem : "added as"
    Product ||--o{ OrderItem : "ordered as"

    User {
        string id PK
        string email UK
        string password
        UserRole role "ADMIN | USER"
        UserStatus status "ACTIVE | BLOCKED | DELETED"
        boolean isVerified
    }
    Session {
        string id PK
        string userId FK
        string refreshToken UK
        string ipAddress
        string userAgent
    }
    ProductCategory {
        string id PK
        string parentId FK "nullable"
        string name
        string description "nullable"
    }
    Product {
        string id PK
        string categoryId FK
        string name
        float price
        string image "nullable"
        boolean isAvailable
    }
    Cart {
        string id PK
        string userId FK
    }
    CartItem {
        string id PK
        string cartId FK
        string productId FK
        int quantity
    }
    Order {
        string id PK
        string userId FK
        OrderStatus status "PENDING → ... → COMPLETED"
    }
    OrderItem {
        string id PK
        string orderId FK
        string productId FK
        int quantity
    }
```

## Environment Variables

All variables are listed in `.env.example`. Copy it to `.env` and fill in the values.

| Variable                | Description                                   | Example / Default                                        |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------- |
| `NODE_ENV`              | Runtime environment                           | `development`                                            |
| `PORT`                  | HTTP port                                     | `3000`                                                   |
| `DATABASE_URL`          | PostgreSQL connection string                  | `postgresql://postgres:postgres@localhost:5432/restaurant-crm?schema=public` |
| `ACCESS_TOKEN_SECRET`   | Secret for signing JWT access tokens          | — (required)                                             |
| `REFRESH_TOKEN_SECRET`  | Secret for hashing refresh tokens (HMAC-SHA512) | — (required)                                           |
| `REFRESH_TOKEN_LIFETIME`| Refresh token lifetime, in days               | `7`                                                      |
| `COOKIE_SECRET`         | Secret for signing cookies                    | — (required)                                             |
| `PASSWORD_SALT_ROUNDS`  | bcrypt cost factor                            | `12`                                                     |
| `EMAIL_USER`            | Gmail address used to send emails             | `your-email@gmail.com`                                   |
| `EMAIL_PASSWORD`        | Gmail app password                            | — (required)                                             |

## Roadmap

Planned features, roughly in priority order:

- [ ] **Cart API** — the `Cart` / `CartItem` models exist; expose add / update / remove / view endpoints and auto-create a cart on registration
- [ ] **Orders API** — checkout from the cart, order history for clients and status management for admins (`OrderStatus` lifecycle is already modeled)
- [ ] **Logout / session revocation** — invalidate the refresh token and clear cookies
- [ ] **Admin user management** — list, block and delete users (`UserStatus` enum is ready)
- [ ] **OpenAPI / Swagger documentation** — generated from the Zod schemas
- [ ] **Tests** — unit and integration coverage
- [ ] **Docker support** — `Dockerfile` + `docker-compose` with PostgreSQL

## License

This project is distributed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## Author

**Bohdan Tsekhmeistruk**
