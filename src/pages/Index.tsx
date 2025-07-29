import { Link } from 'react-router-dom';
import { Clock, PenTool, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-6">
      <div className="max-w-4xl mx-auto text-center space-y-12">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="relative">
            <Clock className="w-24 h-24 mx-auto text-primary animate-float mb-6" />
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-secondary animate-sparkle" />
            </div>
          </div>
          
          <h1 className="text-6xl font-crimson font-bold text-foreground mb-4 leading-tight">
            Welcome to Your
            <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Time Machine
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Capture life's precious moments and transform them into magical memories. 
            Journey through time with stories, voices, and experiences that matter most.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <Link to="/journal" className="block group">
            <div className="glass-card p-8 h-full transition-all duration-300 group-hover:scale-105">
              <PenTool className="w-12 h-12 text-primary mb-4 mx-auto group-hover:animate-pulse" />
              <h3 className="text-2xl font-crimson font-semibold text-foreground mb-3">
                Write Your Story
              </h3>
              <p className="text-muted-foreground mb-6">
                Capture moments through text, voice recordings, or media. 
                Let your memories flow freely.
              </p>
              <Button className="btn-ethereal w-full">
                Start Writing
              </Button>
            </div>
          </Link>

          <Link to="/take-me-back" className="block group">
            <div className="glass-card p-8 h-full transition-all duration-300 group-hover:scale-105">
              <Search className="w-12 h-12 text-secondary mb-4 mx-auto group-hover:animate-pulse" />
              <h3 className="text-2xl font-crimson font-semibold text-foreground mb-3">
                Take Me Back
              </h3>
              <p className="text-muted-foreground mb-6">
                Search through your memories and relive your most 
                cherished moments anytime.
              </p>
              <Button className="btn-ethereal w-full">
                Explore Memories
              </Button>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <PenTool className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-crimson font-semibold text-foreground mb-2">Multi-Modal Entries</h4>
            <p className="text-sm text-muted-foreground">Write, record, or upload media</p>
          </div>
          
          <div className="p-6">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-secondary" />
            </div>
            <h4 className="font-crimson font-semibold text-foreground mb-2">AI-Generated Memories</h4>
            <p className="text-sm text-muted-foreground">Transform entries into rich stories</p>
          </div>
          
          <div className="p-6">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-crimson font-semibold text-foreground mb-2">Time Travel</h4>
            <p className="text-sm text-muted-foreground">Revisit any moment instantly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
