# 🍳 Josie's Faves

A warm, friendly PWA for capturing and saving recipes from cookbooks with a photo. Built for Josie Lauffer — designed for iPhone and iPad, no technical setup required to use it.

---

## What it does

1. **Add a recipe** — tap +, snap a photo of a cookbook page
2. **Auto-reads the text** — Claude Vision extracts the recipe title and full text
3. **Review & save** — fix the title if needed, add the book name, tap Save
4. **Browse your collection** — search by recipe name or ingredient

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Auth | Supabase Auth (magic link, no passwords) |
| Database | Supabase Postgres |
| Storage | Supabase Storage (`recipe-photos` bucket) |
| OCR | Anthropic Claude claude-haiku-4-5 (via Vision API) |
| Deploy | Vercel (free tier) |

---

## Environment Variables

Copy `.env.example` to `.env.local` for local dev:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> ⚠️ `ANTHROPIC_API_KEY` is used **server-side only** in `api/ocr.js` — never add it to any `VITE_` prefixed variable.

---

## Setup: Supabase (do this first)

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Choose a name (e.g. `josies-faves`), set a secure DB password, pick a region
4. Wait ~2 minutes for it to spin up

### Step 2: Run the Database Schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query** and paste the following:

```sql
-- Households (one per family/user for now)
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Profiles (linked to Supabase Auth users)
create table profiles (
  id uuid primary key references auth.users,
  household_id uuid references households,
  display_name text,
  email text,
  created_at timestamptz default now()
);

-- Recipes
create table recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households not null,
  created_by uuid references profiles not null,
  title text not null,
  source text,
  ocr_text text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Full-text search index
create index recipes_fts on recipes using gin(
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(ocr_text,''))
);

-- Favorites
create table favorites (
  user_id uuid references profiles,
  recipe_id uuid references recipes,
  primary key (user_id, recipe_id)
);
```

3. Click **Run** (green button)

### Step 3: Enable Row Level Security (RLS)

Run this in the SQL Editor to allow authenticated users to access their data:

```sql
-- Enable RLS on all tables
alter table households enable row level security;
alter table profiles enable row level security;
alter table recipes enable row level security;
alter table favorites enable row level security;

-- Profiles: users can read/write their own profile
create policy "Users can manage own profile"
  on profiles for all
  using (auth.uid() = id);

-- Households: users can see their household
create policy "Users can see own household"
  on households for all
  using (
    id in (
      select household_id from profiles where id = auth.uid()
    )
  );

-- Recipes: users can manage recipes in their household
create policy "Users can manage household recipes"
  on recipes for all
  using (
    household_id in (
      select household_id from profiles where id = auth.uid()
    )
  );

-- Favorites: users can manage their own favorites
create policy "Users can manage own favorites"
  on favorites for all
  using (auth.uid() = user_id);
```

### Step 4: Create the Storage Bucket

1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Name it exactly: `recipe-photos`
4. Check ✅ **Public bucket** (so photos display in the app)
5. Click **Create bucket**
6. Click on `recipe-photos` → **Policies** tab → **Add policy**
7. Choose "Give users access to only their own top level folder named as uid" OR run:

```sql
-- Storage policy: authenticated users can upload/read recipe photos
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-photos');

create policy "Anyone can view recipe photos"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');
```

### Step 5: Enable Magic Link Auth

1. Click **Authentication** in the left sidebar → **Providers**
2. Make sure **Email** is enabled
3. Click **Email** → scroll down, ensure "Enable email confirmations" is set as you prefer
4. Go to **URL Configuration** and add your Vercel URL (after deploying) to **Redirect URLs**, e.g.:
   ```
   https://josies-faves.vercel.app/**
   ```

### Step 6: Get Your API Keys

1. Click **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

---

## Deploy to Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial Josie's Faves MVP"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New... → Project**
3. Find and import `josies-faves` from GitHub
4. Vercel will auto-detect Vite — the default settings work

### Step 3: Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

| Name | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | All |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | All |

### Step 4: Deploy

Click **Deploy**. Vercel will build and deploy. Your app will be live at `https://josies-faves.vercel.app` (or similar).

### Step 5: Update Supabase Redirect URL

Go back to Supabase → Authentication → URL Configuration and add your actual Vercel URL to Redirect URLs.

---

## Add to iPhone Home Screen (for Josie)

1. Open the app in **Safari** (not Chrome)
2. Tap the **Share button** (box with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

The app will now appear on the home screen and open full-screen like a native app.

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local with your real Supabase + Anthropic keys

# Start dev server
npm run dev
```

> The OCR function at `api/ocr.js` runs as a Vercel serverless function. For local testing, you can use `vercel dev` (requires Vercel CLI).

---

## Project Structure

```
josies-faves/
├── api/
│   └── ocr.js              # Vercel serverless function (Claude Vision OCR)
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker (offline support)
│   └── icons/              # App icons
├── src/
│   ├── hooks/
│   │   └── useAuth.js      # Auth state + profile creation
│   ├── lib/
│   │   └── supabase.js     # Supabase client
│   ├── pages/
│   │   ├── AuthPage.jsx    # Magic link sign-in
│   │   ├── HomePage.jsx    # Recipe grid + search
│   │   ├── AddRecipePage.jsx # Camera → OCR → review → save
│   │   └── RecipeDetailPage.jsx # View recipe + favorite/delete
│   ├── components/
│   │   └── RecipeCard.jsx  # Grid card component
│   ├── App.jsx             # Router/view switcher
│   ├── main.jsx
│   └── index.css           # Tailwind + custom styles
├── .env.example
├── vercel.json
└── README.md
```
