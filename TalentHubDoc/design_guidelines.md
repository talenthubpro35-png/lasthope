# TalentHub Pro - Design Guidelines

## Design Approach

**Selected Framework**: Modern SaaS Dashboard System inspired by Linear, Notion, and Stripe
**Rationale**: TalentHub Pro is a utility-focused recruitment platform requiring clarity, efficiency, and professional polish. The design balances data-dense interfaces with intelligent AI features while maintaining a modern, trustworthy aesthetic suitable for HR/recruitment contexts.

---

## Typography System

**Primary Font**: Inter (Google Fonts)
- Headers: 700 (Bold) - used for page titles, section headers
- Subheaders: 600 (Semi-bold) - card titles, form labels
- Body: 400 (Regular) - general content, descriptions
- Captions: 400 (Regular, smaller size) - metadata, helper text

**Type Scale**:
- Hero/Landing: text-5xl to text-6xl
- Page Titles: text-3xl to text-4xl
- Section Headers: text-2xl
- Card Titles: text-lg to text-xl
- Body: text-base
- Captions: text-sm to text-xs

---

## Layout & Spacing System

**Core Spacing Units**: 4, 6, 8, 12, 16, 24
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-24
- Grid gaps: gap-4, gap-6, gap-8
- Card spacing: p-6 to p-8

**Container Strategy**:
- Dashboard layouts: max-w-7xl mx-auto px-4 to px-6
- Forms: max-w-2xl mx-auto
- Content areas: max-w-4xl
- Full-width tables/grids: w-full with inner constraints

**Grid Systems**:
- Job/Candidate cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Dashboard widgets: grid-cols-1 lg:grid-cols-2 xl:grid-cols-3
- Stats: grid-cols-2 md:grid-cols-4

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with backdrop blur (backdrop-blur-lg bg-white/80)
- Height: h-16
- Contains: Logo, main navigation links, user profile dropdown, notification bell
- Shadow: subtle bottom border (border-b)

**Sidebar (Dashboard)**:
- Width: w-64 on desktop, collapsible on mobile
- Sections: Main navigation, AI Tools, Settings
- Active state: subtle background, border accent on left
- Icons from Heroicons (outline style)

### Cards & Containers
**Standard Card**:
- Background: bg-white
- Border: border with rounded-lg
- Padding: p-6
- Shadow: shadow-sm with hover:shadow-md transition
- Used for: Job listings, candidate profiles, dashboard widgets

**Stat Cards**:
- Compact padding: p-4
- Large number typography: text-3xl font-bold
- Label: text-sm text-gray-600
- Icon positioned top-right or inline

### Forms
**Input Fields**:
- Height: h-10 to h-12
- Border: border with rounded-md
- Focus: focus:ring-2 focus:ring-offset-1
- Labels: text-sm font-medium mb-2
- Helper text: text-xs text-gray-500 mt-1

**Form Layout**:
- Vertical stacking with space-y-4 to space-y-6
- Multi-column forms: grid grid-cols-1 md:grid-cols-2 gap-4
- Action buttons: right-aligned with gap-3

**Textarea**:
- Minimum height: min-h-32
- For job descriptions, candidate bio

**Select/Dropdown**:
- Match input height and styling
- Chevron icon indicator

### Buttons
**Primary Action**:
- Padding: px-6 py-2.5
- Text: font-medium
- Rounded: rounded-md
- For: Submit, Apply, Create Job

**Secondary Action**:
- Border variant with transparent background
- Same padding as primary
- For: Cancel, View Details

**Icon Buttons**:
- Square: w-10 h-10
- Circular for profile actions: rounded-full
- Used for: Edit, Delete, More options

### Data Display
**Tables**:
- Headers: bg-gray-50, text-sm font-semibold, uppercase tracking-wide
- Rows: border-b, hover:bg-gray-50 transition
- Cell padding: px-6 py-4
- Actions column: right-aligned with icon buttons

**Candidate/Job Cards**:
- Header: Title + company/candidate name
- Body: Key info (skills, salary, experience) in badge/pill format
- Footer: Application status or action buttons
- Thumbnail/avatar: top-left, rounded

**Status Badges**:
- Pill shape: rounded-full px-3 py-1
- Text: text-xs font-medium
- States: Applied, Reviewed, Shortlisted, Rejected
- Each with distinct background shade

### AI-Powered Elements
**Chatbot Widget**:
- Fixed position: bottom-right (fixed bottom-4 right-4)
- Floating button: w-14 h-14 rounded-full shadow-lg
- Chat panel: w-96 h-[600px] with rounded-lg shadow-2xl
- Messages: alternating alignment with rounded-2xl bubbles
- Input: sticky bottom with send button

**AI Recommendation Cards**:
- Distinctive indicator (AI badge/icon)
- Slightly elevated: shadow-md
- "Powered by AI" caption in text-xs

**Skill Match Indicator**:
- Percentage display: text-2xl font-bold
- Progress ring or bar visualization
- Breakdown of matching skills

### Overlays & Modals
**Modal**:
- Backdrop: fixed inset-0 bg-black/50
- Panel: max-w-lg to max-w-2xl, rounded-lg shadow-xl
- Header with close button (top-right)
- Footer with action buttons (right-aligned)

**Notifications Toast**:
- Position: fixed top-4 right-4
- Width: max-w-sm
- Auto-dismiss with slide animation
- Icon + message + close button

---

## Dashboard-Specific Layouts

### Candidate Dashboard
- **Header**: Welcome message, quick stats (Applications, Profile Views)
- **Main Grid**: 
  - Recommended Jobs (grid-cols-1 lg:grid-cols-2)
  - Skill Development suggestions (single column)
  - Application Status tracker
- **Profile Section**: Avatar, bio, skills badges, experience timeline

### Recruiter Dashboard
- **Stats Bar**: Active Jobs, Total Applications, Candidates Shortlisted
- **Two-Column Layout**:
  - Left: Job postings list with create button
  - Right: Recent applications or candidate recommendations
- **Candidate Browser**: Filterable grid with AI match scores

### Admin Panel
- **Analytics Focus**: Charts and graphs (use placeholder divs)
- **Management Tables**: Users, Jobs, Applications with bulk actions
- **System Monitoring**: Service status indicators

---

## Special Features

### CV Generator Preview
- A4 paper simulation: max-w-3xl mx-auto with shadow-2xl
- Professional layout with clear sections
- Download button: prominent with icon

### Interview Questions Display
- Numbered list with increased spacing (space-y-4)
- Question cards with difficulty badge
- Copy to clipboard functionality per question

### Real-Time Availability
- Calendar-style grid for availability
- Toggle switches for work preferences
- Start date picker prominently displayed

---

## Images

**Hero Section** (Landing/Marketing Page):
- Full-width hero with gradient overlay
- Image: Modern office environment or diverse team collaboration
- Height: h-[500px] to h-[600px]
- Text overlaid with backdrop-blur on button containers

**Dashboard Backgrounds**:
- Minimal use of images
- Subtle patterns or gradients in empty states
- Avatar/profile photos: rounded-full w-10 h-10 to w-16 h-16

**Feature Illustrations**:
- AI chatbot: Small illustration in chat header
- Empty states: Centered illustrations (max-w-xs) with descriptive text

---

## Animations

Use sparingly:
- Hover states: subtle scale or shadow changes (transition-all duration-200)
- Loading states: Spinning icon for AI processing
- Toast notifications: Slide in from top-right
- Modal: Fade backdrop with scale panel

Avoid:
- Scroll animations
- Complex page transitions
- Parallax effects