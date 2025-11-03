import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, MapPin, Languages, Clock } from 'lucide-react';
import heroImage from '@/assets/hero-civic.jpg';

export default function Home() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Brain,
      title: t('features.ai.title'),
      description: t('features.ai.description'),
    },
    {
      icon: Clock,
      title: t('features.realtime.title'),
      description: t('features.realtime.description'),
    },
    {
      icon: Languages,
      title: t('features.multilingual.title'),
      description: t('features.multilingual.description'),
    },
    {
      icon: MapPin,
      title: t('features.location.title'),
      description: t('features.location.description'),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center text-primary-foreground">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {t('hero.title')}
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-primary-foreground/90 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <Link to="/civic-guide">
                <Button variant="hero" size="lg" className="text-lg">
                  🤖 Try AI Civic Guide
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-lg bg-background/10 backdrop-blur border-primary-foreground/20 text-primary-foreground hover:bg-background/20">
                  {t('hero.cta')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-card">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              {t('features.title')}
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-0 shadow-medium hover:shadow-strong transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="container">
          <Card className="border-0 shadow-strong bg-gradient-hero text-primary-foreground">
            <CardContent className="py-16 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to make a difference?</h2>
              <p className="text-lg mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
                Join thousands of citizens working together to build better communities.
              </p>
              <Link to="/login">
                <Button variant="outline" size="lg" className="bg-background/10 backdrop-blur border-primary-foreground/20 text-primary-foreground hover:bg-background/20">
                  Get Started Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
