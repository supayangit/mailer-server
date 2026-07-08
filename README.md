# Mailer Server - BetterAuth Setup

A Node.js/Express backend server with BetterAuth authentication and email service integration.

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Edit `.env.local` with your settings:

```env
PORT=5000
NODE_ENV=development

# Better Auth
BETTER_AUTH_SECRET=your_random_secret_key_here_change_in_production
BETTER_AUTH_URL=http://localhost:5000

# Database
DATABASE_URL=file:./dev.db

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@yourapp.com

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend
FRONTEND_URL=http://localhost:3000
```

#### Email Setup (Gmail)
1. Enable 2-Factor Authentication on your Google account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Use the generated password as `SMTP_PASSWORD` in `.env.local`

#### OAuth Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create credentials for OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:5000/auth/callback/google` to Authorized redirect URIs
4. Copy Client ID and Secret to `.env.local`

### 3. Generate Secret Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the output for `BETTER_AUTH_SECRET` in `.env.local`.

### 4. Run the Server

**Development with auto-reload:**
```bash
pnpm dev
```

**Production:**
```bash
pnpm start
```

## API Endpoints

### Authentication

- **POST** `/auth/signin` - Sign in with email/password
  ```json
  { "email": "user@example.com", "password": "password" }
  ```

- **POST** `/auth/signup` - Create new account
  ```json
  { "email": "user@example.com", "password": "password", "name": "John Doe" }
  ```

- **POST** `/auth/google` - Google OAuth redirect
- **POST** `/auth/signout` - Sign out user
- **GET** `/auth/me` - Get current user session

### Email

- **POST** `/send-welcome-email` - Send welcome email
  ```json
  { "email": "user@example.com", "name": "John Doe" }
  ```

### Utility

- **GET** `/health` - Server health check

## Project Structure

```
mailer-server/
├── index.js              # Main Express server
├── auth.js              # BetterAuth configuration
├── emailService.js      # Nodemailer email functions
├── .env.local           # Environment variables (DO NOT COMMIT)
├── dev.db              # SQLite database (auto-created)
├── package.json
└── README.md
```

## Connecting to Frontend

Your Next.js frontend proxies to these endpoints:
- `/api/auth/signin` → `http://localhost:5000/auth/signin`
- `/api/auth/signup` → `http://localhost:5000/auth/signup`
- `/api/auth/google` → `http://localhost:5000/auth/google`

Make sure `BACKEND_URL=http://localhost:5000` is set in your frontend `.env.local`.

## Development Notes

- SQLite database (`dev.db`) is auto-created on first run
- BetterAuth uses sessions stored in the database
- Emails are sent asynchronously (non-blocking)
- CORS is enabled for your frontend URL

## Troubleshooting

**"Cannot find module 'better-auth'"**
- Run `pnpm install` again

**"Email failed to send"**
- Check SMTP credentials in `.env.local`
- For Gmail, ensure App Password is used (not regular password)
- Check firewall/antivirus isn't blocking SMTP

**"CORS errors"**
- Ensure `FRONTEND_URL` in `.env.local` matches your frontend URL
- Frontend should send requests with credentials: `{ credentials: 'include' }`

## Security Checklist

- [ ] Change `BETTER_AUTH_SECRET` to a strong random value
- [ ] Use environment-specific `.env` files (never commit `.env.local`)
- [ ] Set `NODE_ENV=production` before deploying
- [ ] Use HTTPS in production
- [ ] Store sensitive data in secure environment variables
- [ ] Enable HTTPS for SMTP if possible (port 465)

## License

ISC
# mailer-server
