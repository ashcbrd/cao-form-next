# SUGB Application

A comprehensive Standard Inquiry for Equitable Pay (SUGB) application with Caoloon integration for pay equity analysis and reporting.

## Features

- 🔐 **Magic Link Authentication** - Passwordless login system
- 🏢 **Caoloon Integration** - Fetch CAO data for organizations
- 📋 **Dynamic Forms** - JSON-driven survey system with conditional logic
- 📊 **PDF Reports** - Professional pay equity analysis reports
- 🔒 **GDPR Compliant** - Data export and deletion capabilities
- 📧 **Email Notifications** - Automated notifications and magic links
- 🎨 **Modern UI** - Built with Next.js 14, Tailwind CSS, and shadcn/ui

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Neon PostgreSQL
- **Authentication**: Custom magic link system with JWT
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Email**: Resend API
- **PDF Generation**: Puppeteer with custom templates
- **Forms**: React Hook Form with Zod validation
- **TypeScript**: Full type safety throughout

## Prerequisites

- Node.js 18+ and npm 8+
- Neon PostgreSQL database
- Resend account for email delivery
- Caoloon API access credentials

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database (automatically provided by Neon integration)
DATABASE_URL=your_neon_database_url
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=http://localhost:3000

# Email Service
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Caoloon API
CAOLOON_BASE_URL=https://api.caoloon.com
CAOLOON_TOKEN=your_caoloon_api_token

# Optional: Redis for queue processing
REDIS_URL=your_redis_url
```

## Installation

1. **Clone and install dependencies:**

   ```bash
   npm install
   ```

2. **Set up the database:**
   - Run the database setup script in the v0 interface:

   ```sql
   -- Execute scripts/001-setup-database.sql
   ```

3. **Configure integrations:**
   - Add Neon integration in Project Settings
   - Add environment variables in Project Settings
   - Configure Resend API key
   - Set up Caoloon API credentials

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── login/             # Login page
│   ├── profile/           # User profile management
│   ├── reports/           # PDF reports dashboard
│   └── survey/            # Dynamic survey form
├── components/            # Reusable UI components
│   ├── caoloon/          # Caoloon integration components
│   ├── form/             # Dynamic form components
│   ├── pdf/              # PDF generation components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── auth/             # Authentication utilities
│   ├── caoloon/          # Caoloon API client
│   ├── db/               # Database utilities
│   ├── form/             # Form validation and types
│   ├── gdpr/             # GDPR compliance tools
│   ├── notifications/    # Email notification system
│   ├── pdf/              # PDF generation utilities
│   └── utils/            # General utilities
└── scripts/              # Database setup scripts
```

## Key Features

### Magic Link Authentication

- Passwordless login system
- Secure JWT-based sessions
- Email verification workflow
- Protected route middleware

### Caoloon Integration

- Search and link organizations to CAO data
- Automatic data synchronization
- Benchmarking capabilities
- Real-time data updates

### Dynamic Survey System

- JSON-driven form configuration
- Multiple question types (text, select, checkbox, etc.)
- Conditional logic and validation
- Progress tracking and draft saving

### PDF Report Generation

- Professional report templates
- Data visualization and charts
- CAO benchmarking integration
- Async processing with queue system

### GDPR Compliance

- Data export functionality
- Account deletion with audit trails
- Privacy-focused design
- Consent management

## API Endpoints

### Authentication

- `POST /api/auth/send-magic-link` - Send magic link email
- `GET /api/auth/verify` - Verify magic link token
- `POST /api/auth/logout` - Logout user

### Caoloon Integration

- `GET /api/caoloon/search` - Search CAO database
- `POST /api/caoloon/link` - Link organization to CAO
- `POST /api/caoloon/sync` - Sync CAO data

### Survey & Reports

- `POST /api/survey/save` - Save survey response
- `POST /api/pdf/generate` - Generate PDF report
- `GET /api/pdf/status/[jobId]` - Check PDF generation status

### GDPR

- `GET /api/gdpr/export` - Export user data
- `DELETE /api/gdpr/delete` - Delete user account

## Development

### Running Tests

```bash
npm run test
```

### Type Checking

```bash
npm run type-check
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

This application is optimized for deployment on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

## Support

For technical support or questions about the SUGB application, please refer to the project documentation or contact the development team.

## License

This project is proprietary software. All rights reserved.
