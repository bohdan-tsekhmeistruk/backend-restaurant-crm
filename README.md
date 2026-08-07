# Backend Restaurant CRM

Version
License: MIT
Node.js
TypeScript
Hono
Prisma
PostgreSQL

REST API backend for a restaurant CRM system, built with **Hono**, **Prisma 7** and **PostgreSQL**.
It provides JWT-based authentication with refresh-token sessions, email verification and password
reset flows, role-based access control (client / admin), a full product catalog with nested
categories, a shopping cart, and a complete order lifecycle from checkout to delivery.

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
  - [Cart (client)](#cart-client)
  - [Orders (client)](#orders-client)
  - [Catalog (admin)](#catalog-admin)
  - [Cart (admin)](#cart-admin)
  - [Orders (admin)](#orders-admin)
  - [Users (admin)](#users-admin)
- [Order Lifecycle](#order-lifecycle)
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
tokens, delivered via signed `httpOnly` cookies. Multiple sessions per user (one per
User-Agent), bound to IP and User-Agent. An empty cart is created automatically on
registration.
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
- **Shopping cart (client)** — get or auto-create a cart, add / update / remove items
(quantity 1–99). Adding an existing product increments its quantity.
- **Shopping cart (admin)** — manage any user's cart by `userId`, including changing the
product on an existing cart item.
- **Orders (client)** — checkout from the cart (creates a `PENDING` order and clears the cart),
view order history, cancel a `PENDING` order.
- **Orders (admin)** — search orders, create orders for any user, update status to any
`OrderStatus`, hard-delete orders.
- **Admin user management** — list users with filters, edit profile fields and roles,
block / unblock and soft-delete accounts (`UserStatus`). Blocking or deleting revokes all
sessions, and non-`ACTIVE` accounts are rejected on login, token refresh and every
authenticated request.
- **Rate limiting** — 30 requests per 10 minutes on all `/auth/`* routes (`hono-rate-limiter`).
- **Security** — bcrypt password hashing, Zod validation on every input, centralized error
handling, typed environment config.



### Coming soon

- **OpenAPI / Swagger documentation** — generated from the Zod schemas.
- **Tests** — unit and integration coverage.
- **Docker support** — `Dockerfile` + `docker-compose` with PostgreSQL.

See the full [Roadmap](#roadmap) below.

## Tech Stack


| Layer         | Technology                                               |
| ------------- | -------------------------------------------------------- |
| Runtime       | Node.js (ESM)                                            |
| Language      | TypeScript (strict mode, NodeNext modules)               |
| Framework     | [Hono](https://hono.dev) + `@hono/node-server`           |
| Validation    | [Zod](https://zod.dev) + `@hono/standard-validator`      |
| ORM           | [Prisma 7](https://www.prisma.io) (`@prisma/adapter-pg`) |
| Database      | PostgreSQL                                               |
| Auth          | JWT (`hono/jwt`), signed cookies, bcrypt                 |
| Email         | Nodemailer (Gmail SMTP)                                  |
| Rate limiting | `hono-rate-limiter`                                      |
| Dev tooling   | `tsx watch`, `tsc`                                       |




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

1. Install dependencies:

```bash
npm install
```

1. Create the environment file and fill in all parameters:

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


| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server with hot reload |
| `npm run build` | Compile TypeScript into `dist/`      |
| `npm start`     | Run the compiled server from `dist/` |


Prisma CLI (not wrapped in npm scripts):

```bash
npx prisma migrate dev --name <migration-name>   # create & apply a migration
npx prisma migrate deploy                        # apply migrations in production
npx prisma generate                              # regenerate the client
```

Quick smoke test — register a user (tokens are returned as signed cookies, cart is created
automatically):

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "Str0ng!Password",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+380501234567"
  }'
```

Add a product to the cart and checkout:

```bash
curl -X POST http://localhost:3000/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{ "productId": "<product-uuid>", "quantity": 2 }'

curl -X POST http://localhost:3000/api/v1/orders \
  -b cookies.txt
```

View order history:

```bash
curl "http://localhost:3000/api/v1/orders?status=PENDING&page=1&limit=20" \
  -b cookies.txt
```



## API Reference

Base URL: `/api/v1`. Authentication is cookie-based (`accessToken` + `refreshToken`,
signed `httpOnly` cookies) — no `Authorization` header is required.

- **Public** — no authentication needed
- **Refresh** — valid `refreshToken` cookie only (no access token required)
- **User** — valid access token (`USER` or `ADMIN` role)
- **Admin** — valid access token with the `ADMIN` role



### Auth

`/api/v1/auth` — rate-limited to 30 requests per 10 minutes.


| Method | Endpoint         | Access  | Description                                                   |
| ------ | ---------------- | ------- | ------------------------------------------------------------- |
| POST   | `/register`      | Public  | Create a `USER` account, start a session, create a cart       |
| POST   | `/login`         | Public  | Log in, set `accessToken` / `refreshToken` cookies            |
| POST   | `/refresh-token` | Refresh | Rotate the access and refresh tokens via refresh cookie (204) |
| POST   | `/logout`        | Refresh | Delete the session and clear auth cookies (204)               |




### Account (client)

`/api/v1/account`


| Method | Endpoint                    | Access | Description                                   |
| ------ | --------------------------- | ------ | --------------------------------------------- |
| GET    | `/me`                       | User   | Get the current user's profile                |
| PATCH  | `/update`                   | User   | Update `firstName`, `lastName` and/or `phone` |
| POST   | `/send-email-verification`  | User   | Send an email verification token              |
| POST   | `/check-email-verification` | User   | Confirm the email with the received token     |
| POST   | `/send-password-reset`      | Public | Send a password reset code by email           |
| POST   | `/check-password-reset`     | Public | Verify the code and set a new password        |




### Catalog (client)

`/api/v1/categories` and `/api/v1/products` — read-only.


| Method | Endpoint  | Access | Description                            |
| ------ | --------- | ------ | -------------------------------------- |
| GET    | `/search` | User   | Paginated search (categories/products) |
| GET    | `/:id`    | User   | Get a single item by UUID              |




### Cart (client)

`/api/v1/cart`


| Method | Endpoint     | Access | Description                                |
| ------ | ------------ | ------ | ------------------------------------------ |
| GET    | `/`          | User   | Get or auto-create the current user's cart |
| POST   | `/items`     | User   | Add item (`productId`, `quantity` 1–99)    |
| PATCH  | `/items/:id` | User   | Update item quantity                       |
| DELETE | `/items/:id` | User   | Remove item from cart                      |




### Orders (client)

`/api/v1/orders`


| Method | Endpoint | Access | Description                                                 |
| ------ | -------- | ------ | ----------------------------------------------------------- |
| GET    | `/`      | User   | List own orders (`status`, `page`, `limit` query params)    |
| GET    | `/:id`   | User   | Get own order by UUID                                       |
| POST   | `/`      | User   | Checkout — create order from cart, clear cart               |
| PATCH  | `/:id`   | User   | Cancel order — `{ "status": "CANCELLED" }` (`PENDING` only) |




### Catalog (admin)

`/api/v1/admin/categories` and `/api/v1/admin/products`.


| Method | Endpoint  | Access | Description                                     |
| ------ | --------- | ------ | ----------------------------------------------- |
| GET    | `/search` | Admin  | Paginated search                                |
| GET    | `/:id`    | Admin  | Get a single item by UUID                       |
| POST   | `/`       | Admin  | Create a category / product                     |
| PATCH  | `/:id`    | Admin  | Update a category / product                     |
| DELETE | `/:id`    | Admin  | Delete (products in a cart/order are protected) |




### Cart (admin)

`/api/v1/admin/cart`


| Method | Endpoint                 | Access | Description                           |
| ------ | ------------------------ | ------ | ------------------------------------- |
| GET    | `/:userId`               | Admin  | Get or auto-create a user's cart      |
| POST   | `/:userId/items`         | Admin  | Add item to user's cart               |
| PATCH  | `/:userId/items/:itemId` | Admin  | Update item (`productId`, `quantity`) |
| DELETE | `/:userId/items/:itemId` | Admin  | Remove item from user's cart          |




### Orders (admin)

`/api/v1/admin/orders`


| Method | Endpoint  | Access | Description                                         |
| ------ | --------- | ------ | --------------------------------------------------- |
| GET    | `/search` | Admin  | Search orders (`userId`, `status`, `page`, `limit`) |
| GET    | `/:id`    | Admin  | Get order by UUID                                   |
| POST   | `/`       | Admin  | Create order for a user (`userId`, `items[]`)       |
| PATCH  | `/:id`    | Admin  | Update order status (any `OrderStatus`)             |
| DELETE | `/:id`    | Admin  | Hard-delete order and its items (204)               |




### Users (admin)

`/api/v1/admin/users`

| Method | Endpoint | Access | Description                                                    |
| ------ | -------- | ------ | -------------------------------------------------------------- |
| GET    | `/`      | Admin  | Search users (`email`, `name`, `role`, `status`, `page`, `limit`) |
| GET    | `/:id`   | Admin  | Get user by UUID                                               |
| PATCH  | `/:id`   | Admin  | Update user (`firstName`, `lastName`, `phone`, `role`, `status`); sessions revoked on block |
| DELETE | `/:id`   | Admin  | Soft-delete user (`status` → `DELETED`), sessions revoked (204) |

Admins cannot change their own `status` / `role` or delete their own account. Non-`ACTIVE`
accounts are rejected on login, token refresh and by the auth middleware on every request.




## Order Lifecycle

Orders progress through the following statuses:

```
PENDING → COOKING → READY_FOR_PICKUP → DELIVERING → DELIVERED → COMPLETED
```

Terminal / exceptional statuses: `CANCELLED`, `REFUNDED`.


| Actor  | Action        | Rules                                                      |
| ------ | ------------- | ---------------------------------------------------------- |
| Client | Checkout      | Cart must not be empty; all products must be `isAvailable` |
| Client | Cancel        | Only `PENDING` → `CANCELLED`                               |
| Client | View          | Own orders only                                            |
| Admin  | Update status | Any `OrderStatus` — no transition validation               |
| Admin  | Create        | Explicit `userId` + `items[]` (bypasses cart)              |
| Admin  | Delete        | Hard delete of order and all order items                   |




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
│       │   ├── auth/            # login / register / refresh-token / logout
│       │   ├── email/           # Nodemailer wrapper (service)
│       │   └── sessions/        # Session persistence (service)
│       ├── client/              # Authenticated client area
│       │   └── modules/
│       │       ├── account/     # Profile, verification, password reset
│       │       ├── cart/        # Shopping cart
│       │       ├── categories/  # Read-only catalog
│       │       ├── orders/      # Checkout, history, cancel
│       │       └── products/    # Read-only catalog
│       └── admin/               # Admin-only area
│           └── modules/
│               ├── cart/        # Manage any user's cart
│               ├── categories/  # Full CRUD
│               ├── orders/      # Full order management
│               ├── products/    # Full CRUD
│               └── users/       # User management (list, block, delete)
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
        string description
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


| Variable                 | Description                                     | Example / Default                                                            |
| ------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `NODE_ENV`               | Runtime environment                             | `development`                                                                |
| `PORT`                   | HTTP port                                       | `3000`                                                                       |
| `DATABASE_URL`           | PostgreSQL connection string                    | `postgresql://postgres:postgres@localhost:5432/restaurant-crm?schema=public` |
| `ACCESS_TOKEN_SECRET`    | Secret for signing JWT access tokens            | — (required)                                                                 |
| `REFRESH_TOKEN_SECRET`   | Secret for hashing refresh tokens (HMAC-SHA512) | — (required)                                                                 |
| `REFRESH_TOKEN_LIFETIME` | Refresh token lifetime, in days                 | `7`                                                                          |
| `COOKIE_SECRET`          | Secret for signing cookies                      | — (required)                                                                 |
| `PASSWORD_SALT_ROUNDS`   | bcrypt cost factor                              | `12`                                                                         |
| `EMAIL_USER`             | Gmail address used to send emails               | `your-email@gmail.com`                                                       |
| `EMAIL_PASSWORD`         | Gmail app password                              | — (required)                                                                 |




## Roadmap

- [x] **Cart API** — client and admin endpoints; cart auto-created on registration
- [x] **Orders API** — checkout from cart, order history, admin status management
- [x] **Logout / session revocation** — invalidate the refresh token and clear cookies
- [x] **Admin user management** — list, block and delete users (`UserStatus` enforced in the application layer)
- [ ] **OpenAPI / Swagger documentation** — generated from the Zod schemas
- [ ] **Tests** — unit and integration coverage
- [ ] **Docker support** — `Dockerfile` + `docker-compose` with PostgreSQL



## License

This project is distributed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## Author

**Bohdan Tsekhmeistruk**