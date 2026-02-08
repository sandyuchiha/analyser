import { Brain, Shield, FolderOpen, Lightbulb, Bell, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Brain,
    title: "Problem Analysis",
    description: "AI breaks down complex situations into clear, actionable insights.",
  },
  {
    icon: FolderOpen,
    title: "Project & Situation Tracking",
    description: "Monitor active cases with stages, statuses, and progress visibility.",
  },
  {
    icon: Shield,
    title: "Evidence & Reference Memory",
    description: "Store notes, screenshots, and feedback. Everything stays organized.",
  },
  {
    icon: Lightbulb,
    title: "AI-Guided Decisions",
    description: "Receive structured recommendations based on your specific context.",
  },
  {
    icon: Bell,
    title: "Smart Awareness",
    description: "Never miss deadlines. Get gentle reminders when action is needed.",
  },
  {
    icon: BookOpen,
    title: "Learning System",
    description: "ANALYSER learns from patterns to prevent repeating past mistakes.",
  },
];

export default function Welcome() {
  return (
    <div className="dark min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="glow-orb w-[600px] h-[600px] -top-48 -left-48 animate-pulse-slow" />
      <div className="glow-orb w-[500px] h-[500px] top-1/2 -right-64 animate-pulse-slow" style={{ animationDelay: '2s' }} />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-tight">ANALYSER</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/auth?mode=signin">Sign In</Link>
              </Button>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-36">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-primary font-medium mb-4 animate-fade-in tracking-wide">
              AN AI THAT SOLVES YOUR PROBLEMS WITHIN MINUTES
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold leading-tight mb-6 animate-fade-in-up">
              Don't stress.{" "}
              <span className="text-gradient">Sit back.</span>
              <br />
              Let ANALYSER think for you.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in-delay-1">
              Explain your situation. ANALYSER analyzes it, tracks progress, stores evidence, 
              and guides you step by step — so you stay calm and in control.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-delay-2">
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth?mode=signup">Get Started Free</Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/auth?mode=signin">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-24 border-t border-border/50">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Everything you need to stay in control
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              ANALYSER combines analysis, tracking, and memory into one calm, focused system.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="container mx-auto px-6 py-24 border-t border-border/50">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Ready to think clearly?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start using ANALYSER today. No credit card required.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup">Get Started Free</Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 border-t border-border/50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <span>ANALYSER</span>
            </div>
            <p>© 2024 ANALYSER. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
