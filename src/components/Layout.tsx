import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, PenTool, Search } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background particles */}
      <div className="particles">
        <div className="particle absolute top-1/4 left-1/4 animate-float"></div>
        <div className="particle absolute top-1/3 right-1/4 animate-drift"></div>
        <div className="particle absolute bottom-1/4 left-1/3 animate-float"></div>
        <div className="particle absolute top-1/2 right-1/3 animate-drift"></div>
        <div className="sparkle absolute top-1/5 left-1/2 animate-sparkle"></div>
        <div className="sparkle absolute bottom-1/3 right-1/5 animate-sparkle"></div>
      </div>

      {/* Ethereal gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 p-6">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <Clock className="w-8 h-8 text-primary group-hover:animate-pulse" />
            <h1 className="text-3xl font-crimson font-semibold text-foreground">
              Time Machine
            </h1>
          </Link>

          <div className="flex items-center space-x-8">
            <Link
              to="/journal"
              className={`nav-link flex items-center space-x-2 ${
                location.pathname === '/journal' ? 'text-primary' : ''
              }`}
            >
              <PenTool className="w-5 h-5" />
              <span>Write Entry</span>
            </Link>
            <Link
              to="/take-me-back"
              className={`nav-link flex items-center space-x-2 ${
                location.pathname === '/take-me-back' ? 'text-primary' : ''
              }`}
            >
              <Search className="w-5 h-5" />
              <span>Take Me Back</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 min-h-[calc(100vh-120px)]">
        {children}
      </main>
    </div>
  );
};

export default Layout;