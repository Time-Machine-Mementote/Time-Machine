# Berkeley Memory Map

A mobile web app (PWA) that displays a map of UC Berkeley and auto-plays short, generated audio "memories" tied to exact locations as you walk around campus.

## 🎯 Features

- **Interactive UC Berkeley Map** - Built with Mapbox GL JS
- **Location-Based Memory Playback** - Audio plays when you enter memory radius
- **Memory Creation** - Add memories with text, voice, or clipboard paste
- **AI-Powered Processing** - OpenAI integration for entity extraction and TTS
- **Real-time Geofencing** - Turf.js for proximity detection
- **Supabase Backend** - PostgreSQL with PostGIS for spatial data
- **PWA Support** - Installable on mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Mapbox API token
- OpenAI API key
- Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/berkeley-memory-map.git
   cd berkeley-memory-map
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create `.env.local` file:
   ```bash
   # Berkeley Memory Map Environment Variables
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   MAPBOX_GEOCODING_TOKEN=your_mapbox_token_here
   VITE_OPENAI_API_KEY=your_openai_key_here

   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase Database**
   - Go to your Supabase dashboard
   - Run the migration files in `supabase/migrations/`
   - See `SUPABASE_SETUP.md` for detailed instructions

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:8080` (or the port shown in terminal)

## 🗄️ Database Setup

### Run Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/20250115000002_clean_migration.sql`
3. Run `supabase/migrations/20250115000005_complete_fix.sql`

### Verify Setup
```sql
SELECT COUNT(*) as memory_count FROM public.memories;
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── MapScreen.tsx   # Main map interface
│   ├── AddMemorySheet.tsx # Memory creation form
│   └── ui/             # Shadcn/ui components
├── hooks/              # Custom React hooks
│   └── useGeofencing.ts # Location tracking
├── services/           # API services
│   └── memoryApi.ts    # Supabase integration
├── types/              # TypeScript definitions
│   └── memory.ts       # Memory data types
└── utils/              # Utility functions
    └── audioQueue.ts   # Audio playback management

supabase/
├── functions/          # Edge functions
│   ├── extract-entities/
│   ├── geocode-place/
│   └── generate-audio/
└── migrations/        # Database migrations
```

## 🎨 Key Components

- **MapScreen**: Main map interface with Mapbox integration
- **AddMemorySheet**: Scrollable form for creating memories
- **SupabaseTest**: Database connection testing widget
- **useGeofencing**: Location tracking and proximity detection

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: Shadcn/ui + Tailwind CSS
- **Maps**: Mapbox GL JS
- **Backend**: Supabase (PostgreSQL + PostGIS)
- **AI**: OpenAI API (GPT-4 + TTS)
- **Geospatial**: Turf.js
- **State**: Zustand

## 📱 PWA Features

- Installable on mobile devices
- Offline-capable (with service worker)
- Native app-like experience
- Push notifications support (future)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- UC Berkeley for the campus inspiration
- Mapbox for mapping services
- OpenAI for AI capabilities
- Supabase for backend infrastructure