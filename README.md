# DOPE TONE VAULT — dopetonevault.com

Production-ready e-commerce platform for selling beats, samples and packs. Single-owner catalog, buyers only. Built to scale on the edge.

Live: https://dopetonevault.com

### Platform Overview

Full music commerce system with storefront, licensing engine, global audio player, cart and checkout, and creator control center with analytics and CRM.

**Storefront:** Featured curation, Beat's Arsenal catalog, real-time genre filtering, search, waveform preview, trending logic, persistent global audio player with queue, shuffle, repeat, like, cart.

**Commerce:** Multi-tier licensing system — Free, Basic, Pro, Exclusive — with rights management, multi-track cart, dynamic pricing, Selected Licence checkout flow.

**Control Center:** Metrics dashboard, track performance graph, top performing ranking, quick player, track CRUD, email audience segmentation, support ticket system.

### Full Tech Stack — Everything I Used

**Frontend:**
- JavaScript (ES6+), Vanilla JS, React.js, HTML5, CSS3, Tailwind CSS, Responsive Design, Component-Based UI, Custom Hooks, State Management, LocalStorage, SessionStorage, DOM Manipulation, Audio API, Web Audio API, Waveform Rendering, Client-Side Routing, Fetch API, Async/Await, Promise Handling

**Backend:**
- Cloudflare Workers, Hono.js, Node.js, RESTful API Design, Edge Computing, Serverless Functions, API Gateway, Worker Bindings, Environment Variables, Middleware, Error Handling, Rate Limiting, CORS

**Database & Storage:**
- Cloudflare D1 (SQLite at Edge), SQL, Relational Database Design, Schema Design, Migrations, Queries, Joins, Indexing, R2 Object Storage, File Upload Handling, Signed URLs, Asset Management, Data Modeling

**Authentication & Security:**
- Resend API, Email Verification, OTP Authentication, Passwordless Auth, JWT, Session Management, Secure Cookies, RBAC (Role Based Access Control), Input Validation, XSS Protection, CSRF Protection, Secure Headers

**E-Commerce & Business Logic:**
- Cart System, Licensing Logic, Checkout Flow, Order Management, Inventory Management (catalog), Pricing Engine, Discount Logic, Revenue Tracking

**Analytics & CRM:**
- Custom Analytics Engine, Track Performance Metrics, KPI Dashboard, Data Visualization, Chart.js / Canvas Graph, Email Audience Segmentation, Newsletter System, Support Ticket System (D1-backed), User Activity Tracking

**Dev Tools & Ops:**
- VS Code, Git, GitHub, Wrangler CLI, Cloudflare Pages, Cloudflare Dashboard, NPM, Package.json, Environment Config, .env Management, CI/CD via Cloudflare, Version Control, Branch Management

**Architecture Concepts I Implemented:**
- Edge-Native Architecture, Serverless Architecture, JAMstack, API-First Design, Separation of Concerns, Modular Code Structure, Reusable Components, Scalable Folder Structure, Single-Owner Marketplace Pattern, Auto-Rendering Playlist Engine (event-driven UI)

### Core Systems Logic

**1. Upload & Delivery Pipeline**
Control Center Create Button → Upload audio + cover → R2 for files + D1 for metadata (title, BPM, key, genre, price, licenses) → Workers APIs resolve R2 URLs + D1 data → Frontend fetches and renders in Featured, Arsenal, Trending, Player.

**2. Track Management (CRUD)**
Full control to search any track, edit price, cover, title, BPM, key, genre, or delete completely from D1 and R2. Changes reflect live via Workers cache purge.

**3. Playlist Engine — Event Driven**
Playlists are not manual. They auto-render on precise user activity:
- Liked Beats playlist renders after like event
- Recent Tracks renders after play event
- Downloads renders after download event
- User playlists auto-create on account creation
All stored in D1, synced via Workers.

**4. Auth Flow**
Resend handles verification. User enters email → Resend sends OTP code → Validate → Session created. Secure signin, password reset with OTP, session expiry, protected routes for control-center.

**5. Player System**
Custom built persistent player at bottom — play, pause, next, prev, shuffle, repeat, seek, volume, like, add to cart, download. Maintains state across page navigation. Waveform visualization per track.

### What This Proves I Can Build
- Full-stack SaaS e-commerce from zero to production
- Edge infrastructure with Workers + D1 + R2
- Secure auth and role management
- Real-time analytics dashboard
- Audio streaming platform with complex UI state
- Scalable database and storage architecture

### Links
- Website: dopetonevault.com
- Stack: Cloudflare Ecosystem, React, Vanilla JS, Resend, REST APIs

Built by DOPE TONE — Dubai, UAE — Full-Stack Developer / Edge Platform Engineer
