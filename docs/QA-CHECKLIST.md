# ✅ Quality Assurance Checklist - Ulu Winery Calculator

Complete testing checklist to ensure all features work correctly before deployment.

---

## 🔐 Authentication & Security

### Login Flow
- [ ] Login page loads correctly (`/login.html`)
- [ ] Can login with default admin credentials (admin@ulu-winery.co.il / Admin123!)
- [ ] Invalid credentials show appropriate error
- [ ] Session persists after login
- [ ] Logout works correctly
- [ ] Cannot access protected pages without login
- [ ] Redirected to login when session expires

### Password Management
- [ ] Forced password change on first login
- [ ] Password strength validation works
- [ ] New password must be different from old
- [ ] Change password feature works in admin panel
- [ ] Password requirements are clear

### Session Management
- [ ] Session cookie is httpOnly
- [ ] Session cookie is secure (HTTPS only in production)
- [ ] Session expires after 24 hours
- [ ] Multiple tabs share same session
- [ ] Incognito mode works correctly

---

## 🧮 Calculator Core Features

### Step 1: Event Details
- [ ] Guest count validation (minimum 20)
- [ ] Adult count updates automatically
- [ ] Child count multiplies by child factor (0.75)
- [ ] Adult-equivalent calculation is correct
- [ ] Event duration selector works (short/medium/long)

### Step 2: Food Selection
- [ ] Three food modes available:
  - [ ] Winery Food (our_food)
  - [ ] External Catering (catering)
  - [ ] Client Brings Food (customer_catering)
- [ ] Food extras (quiches, pizza, snack) appear for winery food
- [ ] Price per guest updates correctly
- [ ] Child portions calculated at 75% (configurable)

### Step 3: Wine Selection
- [ ] Wine tier selector shows all tiers (ULU, Kosher)
- [ ] Automatic calculation button works
- [ ] Wine bottles distributed by ratio (verify 20%/40%/40%)
- [ ] Minimum 3 bottles (one of each color) when guests >= minimum
- [ ] Manual entry overrides automatic
- [ ] Total bottles sum correctly
- [ ] Wine types with 0% ratio are hidden
- [ ] Priority works: Rose > White > Red for rounding

#### Wine Ratio Tests
Test with 10 guests, ratio 20% red / 40% rose / 40% white:
- [ ] Result: 2 red, 4 rose, 4 white ✓

Test with 15 guests, ratio 30% red / 30% rose / 40% white:
- [ ] Result: ~1 red, ~1 rose, ~1 white minimum
- [ ] Distribution respects ratios as closely as possible

Test with 0% white ratio:
- [ ] White wine input field is hidden
- [ ] Only red and rose distributed

### Step 4: Drinks
- [ ] Hot drinks quantity changes by duration:
  - [ ] Short: 1 per person
  - [ ] Medium: 1.5 per person
  - [ ] Long: 2 per person
- [ ] Cold drinks quantity changes by duration:
  - [ ] Short: 1 per person
  - [ ] Medium: 1.5 per person
  - [ ] Long: 2 per person
- [ ] Child multipliers apply (0.75 for hot, 1.0 for cold)
- [ ] Manual entry overrides automatic

### Step 5: Add-ons
- [ ] Can add new addon
- [ ] Three commission types work:
  - [ ] Fixed price (no commission)
  - [ ] Winery brings - per event (15% commission added)
  - [ ] Winery brings - per person (15% commission added × guests)
  - [ ] Customer brings - per person (₪10-60 configurable)
- [ ] Addon calculations correct:
  - [ ] Vendor price: what we pay
  - [ ] Commission: our profit
  - [ ] Full price: vendor price + commission (customer pays)
- [ ] Can edit addon values
- [ ] Can delete addon
- [ ] Total updates dynamically

### Pricing Calculations
- [ ] Base price calculated correctly
- [ ] Revenue targets applied by guest count (interpolated)
- [ ] Different margins for 3 food modes
- [ ] Minimum 30% margin enforced
- [ ] Staffing costs calculated:
  - [ ] Worker count correct per guest matrix
  - [ ] Manager bonus applies
  - [ ] Revenue component added
- [ ] VAT applied correctly (18%)
- [ ] Venue fees added (if configured)

---

## 📄 Output Generation

### PDF Export
- [ ] PDF generates without errors
- [ ] Logo appears (if configured)
- [ ] All sections present:
  - [ ] Header with winery branding
  - [ ] Event details
  - [ ] Food breakdown
  - [ ] Wine breakdown (consolidated, not split)
  - [ ] Drinks breakdown
  - [ ] Add-ons with commissions
  - [ ] Staffing costs
  - [ ] Subtotals and totals
  - [ ] VAT breakdown
  - [ ] Footer with contact info
- [ ] Hebrew text displays correctly (RTL)
- [ ] Numbers formatted properly (₪ symbol, commas)
- [ ] Page breaks appropriately
- [ ] Colors match branding

### Excel Export
- [ ] Excel file downloads
- [ ] All tabs present:
  - [ ] Summary
  - [ ] Itemized Breakdown
  - [ ] Cost Analysis
- [ ] Wine entry is single consolidated row (not baseline + extra)
- [ ] Addon accounting correct:
  - [ ] Income = full price (customer pays)
  - [ ] Cost = vendor price (what we pay)
  - [ ] Revenue = commission (our profit)
- [ ] Formulas work correctly
- [ ] Totals match PDF
- [ ] Hebrew text readable

---

## ⚙️ Admin Panel

### General Settings
- [ ] VAT slider works (0-30%)
- [ ] Child factor slider works (0-100%)
- [ ] Minimum guests slider works (10-100)
- [ ] Addon commission settings:
  - [ ] Winery commission rate (0-50%, default 15%)
  - [ ] Customer min (₪5-100, default ₪10)
  - [ ] Customer max (₪10-200, default ₪60)
  - [ ] Customer default (₪10-100, default ₪40)
- [ ] Values persist after save
- [ ] Live display updates

### Food Section
- [ ] Winery food price editable
- [ ] Food extras (quiches, pizza, snack) editable
- [ ] Catering markup adjustable
- [ ] Customer catering fee adjustable
- [ ] All values save correctly

### Wine Section
- [ ] Bottles per guest ratio adjustable
- [ ] Color ratios adjustable (white/rose/red)
- [ ] Ratio validation ensures sum = 100%
- [ ] Wine tier pricing per color editable
- [ ] ULU vs Kosher split adjustable
- [ ] Minimum guests for all types configurable

### Drinks Section
- [ ] Hot drink cost and markup editable
- [ ] Cold drink cost and markup editable
- [ ] Duration multipliers editable:
  - [ ] Short (1 hot, 1 cold)
  - [ ] Medium (1.5 hot, 1.5 cold)
  - [ ] Long (2 hot, 2 cold)
- [ ] Child multipliers editable

### Staffing Section
- [ ] Worker rate editable
- [ ] Manager bonus editable
- [ ] Revenue component editable
- [ ] Worker matrix editable per guest range:
  - [ ] 20-39 guests
  - [ ] 40-59 guests
  - [ ] 60-79 guests
  - [ ] 80-100 guests
- [ ] Separate for winery food vs catering

### Revenue Targets
- [ ] Target margins editable per food mode
- [ ] Guest count breakpoints adjustable
- [ ] Interpolation works between breakpoints
- [ ] All three modes configurable:
  - [ ] our_food (highest margins)
  - [ ] catering (medium margins)
  - [ ] customer_catering (lowest margins)

### Venues Section
- [ ] Venue options editable (inside, outside, traklin, combined)
- [ ] Base fees adjustable
- [ ] Location multipliers work
- [ ] Venue costs tracked separately

### Branding Section
- [ ] Logo upload works
- [ ] Logo dimensions adjustable
- [ ] Custom font URL configurable
- [ ] Report title editable
- [ ] Footer lines editable
- [ ] Changes reflect in PDF

### Import/Export Section
- [ ] Can export current config as JSON
- [ ] Can import config from JSON file
- [ ] Import validates structure
- [ ] Bad JSON shows error message
- [ ] Can download config.js file
- [ ] Can download quotas.js file

### Extras/Add-ons Section
- [ ] Can add new default addon
- [ ] Can edit existing addons
- [ ] Can delete addons
- [ ] Addon defaults appear in calculator
- [ ] Price and description editable

### Users Section (if implemented)
- [ ] Can create new users
- [ ] Can edit user details
- [ ] Can change user role (admin/user)
- [ ] Can deactivate users
- [ ] Can reset user passwords
- [ ] Email notifications work (if configured)

### Dashboard Section (if implemented)
- [ ] Recent quotes displayed
- [ ] Usage statistics shown
- [ ] Quick links work

---

## 💾 Data Persistence

### Configuration Saving
- [ ] Changes save automatically (300ms debounce)
- [ ] Save status indicator shows:
  - [ ] Pending (yellow)
  - [ ] Saving (blue spinner)
  - [ ] Success (green checkmark)
  - [ ] Error (red X)
- [ ] Server saves to `server/data/config.json`
- [ ] Fallback to localStorage if server unavailable
- [ ] Config.js file updated on server
- [ ] Quotas.js file updated on server

### Cross-Tab Sync
- [ ] Open admin in two browser tabs
- [ ] Change value in tab 1
- [ ] Tab 2 updates automatically
- [ ] No conflicts or data loss
- [ ] Storage events trigger correctly

---

## 🌐 API Endpoints

### Health Check
```bash
curl http://localhost:3000/api/health
```
- [ ] Returns 200 OK
- [ ] JSON response with status: "healthy"

### Get Config
```bash
curl http://localhost:3000/api/config \
  -H "Cookie: connect.sid=<session-cookie>"
```
- [ ] Requires authentication
- [ ] Returns current config JSON
- [ ] 401 if not logged in

### Update Config
```bash
curl -X PUT http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<session-cookie>" \
  -d '{ "vat": 0.18 }'
```
- [ ] Requires admin role
- [ ] Updates config successfully
- [ ] Returns success message
- [ ] 403 if not admin

### Get Quotas
```bash
curl http://localhost:3000/api/quotas \
  -H "Cookie: connect.sid=<session-cookie>"
```
- [ ] Requires authentication
- [ ] Returns quotas array
- [ ] 401 if not logged in

### Update Quotas
```bash
curl -X PUT http://localhost:3000/api/quotas \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<session-cookie>" \
  -d '[{ "label": "Test", "price": 100 }]'
```
- [ ] Requires admin role
- [ ] Updates quotas successfully
- [ ] 403 if not admin

---

## 📱 Responsive Design

### Desktop (1920×1080)
- [ ] All elements visible
- [ ] No horizontal scroll
- [ ] Layout looks professional
- [ ] Typography readable

### Tablet (768×1024)
- [ ] Layout adapts correctly
- [ ] Touch targets large enough
- [ ] Forms usable
- [ ] Admin panel functional

### Mobile (375×667)
- [ ] Calculator usable (though not optimal)
- [ ] Text readable
- [ ] Buttons accessible
- [ ] No critical features broken

---

## 🎨 UI/UX

### General
- [ ] Hebrew text displays correctly (RTL)
- [ ] Font (Heebo) loads properly
- [ ] Colors match branding (gold #b48a3e, cream #f5f1e9)
- [ ] No console errors
- [ ] No broken images
- [ ] Loading states clear
- [ ] Error messages helpful

### Accessibility
- [ ] Font size controls work (12-22px)
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast sufficient

### Performance
- [ ] Page loads in < 3 seconds
- [ ] No blocking JavaScript
- [ ] Images optimized
- [ ] No memory leaks
- [ ] Smooth scrolling

---

## 🔒 Security

### Input Validation
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] CSRF protection enabled
- [ ] File upload validation (if applicable)
- [ ] Rate limiting works

### Authentication
- [ ] Passwords hashed (bcrypt)
- [ ] Session tokens secure
- [ ] No credentials in URLs
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production

### Authorization
- [ ] Admin-only routes protected
- [ ] User cannot access admin endpoints
- [ ] Database queries use parameterized statements
- [ ] File system access restricted

---

## 🐛 Error Handling

### Network Errors
- [ ] Server down: shows friendly message
- [ ] Timeout: retries appropriately
- [ ] 500 error: shows error page
- [ ] 404 error: shows not found page
- [ ] 403 error: shows forbidden page

### User Errors
- [ ] Invalid input: shows validation message
- [ ] Required fields: clear indication
- [ ] Form errors: inline feedback
- [ ] Retry mechanisms available

### Edge Cases
- [ ] 0 guests: validation prevents
- [ ] Negative values: validation prevents
- [ ] Very large numbers: handled gracefully
- [ ] Empty forms: cannot submit
- [ ] Rapid clicking: debounced

---

## 💻 Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 🚀 Performance Benchmarks

- [ ] First Contentful Paint: < 1.5s
- [ ] Time to Interactive: < 3.5s
- [ ] Lighthouse Score: > 90
- [ ] Bundle size: < 500KB
- [ ] API response time: < 200ms

---

## 📊 Integration Tests

### End-to-End User Flow
1. [ ] User opens calculator
2. [ ] Enters event details (50 guests, 10 children)
3. [ ] Selects winery food + quiches
4. [ ] Uses automatic wine calculation
5. [ ] Selects medium duration for drinks
6. [ ] Adds photographer addon (winery brings, per event)
7. [ ] Reviews summary
8. [ ] Exports PDF
9. [ ] Exports Excel
10. [ ] Verifies all calculations match

### Admin Configuration Flow
1. [ ] Admin logs in
2. [ ] Opens admin panel
3. [ ] Changes wine ratio to 20/40/40
4. [ ] Changes winery commission to 18%
5. [ ] Saves changes
6. [ ] Opens calculator in new tab
7. [ ] Verifies changes applied
8. [ ] Creates event
9. [ ] Checks wine distribution matches new ratio
10. [ ] Checks addon commission uses 18%

---

## 📝 Documentation

- [ ] README.md up to date
- [ ] DEPLOYMENT.md complete
- [ ] CLAUDE.md accurate
- [ ] .env.example provided
- [ ] API documented
- [ ] Comments in code clear
- [ ] Git commits descriptive

---

## 🎉 Production Readiness

### Pre-Launch
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security hardened
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Default passwords changed

### Launch Day
- [ ] Announce to team
- [ ] Monitor logs
- [ ] Watch for errors
- [ ] Collect feedback
- [ ] Document issues
- [ ] Prepare hotfixes if needed

### Post-Launch (Week 1)
- [ ] Daily log review
- [ ] User feedback collected
- [ ] Performance metrics tracked
- [ ] Bug reports prioritized
- [ ] Quick wins implemented
- [ ] Team training completed

---

## ✅ Sign-Off

- [ ] **Developer**: Code reviewed and tested
- [ ] **QA**: All tests passing
- [ ] **Admin**: Configuration verified
- [ ] **Manager**: Business logic correct
- [ ] **Client**: Approved for deployment

---

**Testing Date:** _______________
**Tested By:** _______________
**Approved By:** _______________
**Deployment Date:** _______________

---

Made with ❤️ and 🍷 by Ulu Winery
