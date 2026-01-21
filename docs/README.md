# Ulu Winery Event Pricing Calculator

מחשבון תמחור אירועים ליקב אולו עם ממשק ניהול מתקדם ועדכונים חיים.

## ✨ Features

- 🎨 **Modern Admin UI** - Enhanced interface with sliders, visual controls, and real-time validation
- 💾 **Live Updates** - Automatic configuration sync without file downloads
- 📊 **Smart Calculations** - Complex pricing logic for events, catering, wine, and staffing
- 🍷 **Wine Management** - Visual ratio controls with automatic validation
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔒 **Secure** - Ready for authentication and authorization (coming soon)

## 🚀 Quick Start

### Installation

```bash
# Navigate to project directory
cd C:\Code\ulu-calculator\Ulu-win

# Install dependencies
npm install
```

### Running the Server

**Development Mode** (with auto-restart):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The server will start at `http://localhost:3000`

### Accessing the Application

- **Calculator**: http://localhost:3000/index.html
- **Admin Panel**: http://localhost:3000/admin.html
- **API Health**: http://localhost:3000/api/health

## 📁 Project Structure

```
Ulu-win/
├── 📄 HTML Pages
│   ├── index.html              # Main calculator
│   ├── admin.html              # Admin panel
│   ├── login.html              # Login page
│   ├── change-password.html    # Password change
│   ├── example.html            # Quote template
│   └── 403/404/500.html        # Error pages
│
├── 📁 server/                  # Backend (Node.js + Express)
│   ├── index.js               # Express server with API
│   ├── db/                    # Database configuration
│   ├── models/                # Data models
│   ├── routes/                # API routes
│   ├── middleware/            # Auth & other middleware
│   ├── services/              # Email & other services
│   └── data/                  # Runtime data (auto-created)
│
├── 📁 src/                     # Frontend application
│   ├── app/                   # Calculator core
│   ├── admin/                 # Admin panel (modular)
│   ├── react/                 # React wrapper
│   ├── utils/                 # Shared utilities
│   ├── pricing-engine.js      # Pricing algorithms
│   ├── config-override.js     # LocalStorage system
│   └── quotas.js              # Default addons
│
├── 📁 styles/                  # CSS files
│   ├── main.css               # Calculator styles
│   └── admin.css              # Admin styles
│
├── 📁 partials/                # HTML partials
│   └── calculator.html        # Calculator UI (HTMX)
│
├── 📁 docs/                    # Documentation
│   ├── DEPLOYMENT.md          # Full deployment guide
│   ├── DEPLOYMENT-SUMMARY.md  # Quick start guide
│   └── QA-CHECKLIST.md        # Testing checklist
│
├── 📁 Deployment Files
│   ├── .env.example           # Environment template
│   ├── .dockerignore          # Docker build exclusions
│   ├── Dockerfile             # Docker image config
│   ├── docker-compose.yml     # Docker orchestration
│   └── ecosystem.config.js    # PM2 configuration
│
├── 📄 config.js                # Base configuration
├── 📄 package.json             # Dependencies
├── 📄 README.md                # This file
└── 📄 CLAUDE.md                # Architecture guide
```

## 🔌 API Endpoints

### GET /api/config
Get current configuration
```bash
curl http://localhost:3000/api/config
```

### PUT /api/config
Update configuration
```bash
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d @new-config.json
```

### GET /api/quotas
Get default quotas/addons
```bash
curl http://localhost:3000/api/quotas
```

### PUT /api/quotas
Update quotas
```bash
curl -X PUT http://localhost:3000/api/quotas \
  -H "Content-Type: application/json" \
  -d @new-quotas.json
```

### GET /api/health
Health check endpoint
```bash
curl http://localhost:3000/api/health
```

## 💡 How Live Updates Work

1. **Auto-Save**: Changes in admin panel are automatically saved every 500ms
2. **Status Indicator**: Visual feedback shows save status (pending, saving, success, error)
3. **Fallback**: If server is unavailable, falls back to localStorage
4. **Sync**: Both `config.js` and `server/data/config.json` are updated
5. **Backward Compatible**: JS files still work for static hosting

## 🎨 Admin UI Enhancements

### Sliders & Visual Controls
- **VAT**: Visual percentage slider (0-30%)
- **Child Factor**: Interactive ratio slider with live display
- **Wine Ratios**: Color-coded sliders with visual distribution bars
- **Validation**: Real-time validation ensuring wine ratios sum to 100%

### Setting Cards
- Hover effects with subtle shadows
- Live value display in gold accent color
- Helper text with clear explanations
- Mobile-responsive layout

## 📝 Configuration

### General Settings
- VAT rate
- Child factor (portion of adult serving)
- Minimum guests for events

### Food & Catering
- Winery food pricing
- Catering markup
- Client-provided catering fees
- Food extras (quiches, pizza, snacks)

### Wine
- Bottles per guest ratio
- Color distribution (white, rosé, red)
- Supplier mix (ULU vs Kosher)
- Tier pricing per color

### Staffing
- Worker rates
- Manager bonuses
- Worker matrix by guest count

### Revenue Targets
- Target margins by menu type
- Guest count thresholds

## 🔐 Security (Coming Soon)

- User authentication
- Role-based access control
- Admin-only access to admin panel
- Password strength requirements
- Email-based credential delivery

## 🚢 Deployment

The application can be deployed to:
- Render
- Railway
- Vercel (with serverless functions)
- Any Node.js hosting platform

Environment variables:
- `PORT`: Server port (default: 3000)

## 🐛 Troubleshooting

### Server won't start
- Ensure Node.js 18+ is installed: `node --version`
- Check if port 3000 is available
- Verify npm dependencies are installed: `npm install`

### Configuration not saving
- Check server is running: http://localhost:3000/api/health
- Open browser console for error messages
- Check `server/data/` directory permissions

### Changes not appearing
- Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear localStorage in browser DevTools
- Restart server

## 📄 License

ISC

## 👥 Author

Ulu Winery

---

Made with ❤️ and 🍷
