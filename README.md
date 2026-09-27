# TechNova — Full Admin + Store Website

This version adds a real server-side admin panel.

## Features
- Professional TechNova storefront
- Admin login
- Add/edit/delete products
- Upload product images
- Product name, brand, description, price, stock and category
- Featured products
- Product search and category filter
- Customer enquiry storage
- SQLite database
- Session-based admin authentication
- Uploaded images served from the server
- Responsive design

## Run locally
1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run `npm install`
4. Copy `.env.example` to `.env`.
5. Change `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `SESSION_SECRET`.
6. Run `npm start`
7. Open `http://localhost:3000`
8. Admin panel: `http://localhost:3000/admin`

## Important production notes
- Do not use the example admin password in production.
- Use HTTPS.
- Set a long random SESSION_SECRET.
- Configure secure cookies behind HTTPS.
- Back up the SQLite database and uploads.
- For a multi-server deployment, use managed database/object storage instead of local disk.
- Live payments are NOT enabled in this package. A payment gateway such as Razorpay should be connected with server-side order creation and signature verification before accepting real money.
- GitHub Pages cannot run this Node/Express backend. This full version must be deployed to a server platform such as Render, Railway, Fly.io, VPS, or another Node.js host.
