import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, MapPin, Languages, Clock } from 'lucide-react';
import heroImage from '@/assets/hero-civic.jpg';
import { FloatingChatbot } from '@/components/FloatingChatbot';

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
    <div className="min-h-screen bg-surface-50">
      <FloatingChatbot />

      {/* Hero Section - two column */}
      <section className="relative overflow-hidden">
        <div className="container py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="max-w-2xl">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-4">Trusted by citizens</span>
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6 text-slate-900">{t('hero.title')}</h1>
                <p className="text-lg text-slate-700 mb-8 leading-relaxed">{t('hero.subtitle')}</p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/civic-guide">
                    <Button variant="hero" size="lg" className="shadow-md transform hover:-translate-y-0.5 transition">🤖 Try AI Civic Guide</Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" className="border-slate-200 text-slate-900">{t('hero.cta')}</Button>
                  </Link>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 text-center shadow">
                    <div className="text-2xl font-bold">10k+</div>
                    <div className="text-xs text-muted-foreground">Reports</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow">
                    <div className="text-2xl font-bold">95%</div>
                    <div className="text-xs text-muted-foreground">Response Rate</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center shadow">
                    <div className="text-2xl font-bold">50+</div>
                    <div className="text-xs text-muted-foreground">Cities</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img src={heroImage} alt="Civic hero" className="w-full h-80 md:h-[520px] object-cover" />
                </div>
                <div className="absolute -bottom-6 left-6 w-64 bg-white rounded-xl shadow-lg p-4 border">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-indigo-50 p-2">
                      <MapPin className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Local Impact</div>
                      <div className="text-xs text-muted-foreground">See resolved issues in your area</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t('features.title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('features.subtitle') || ''}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 hover:shadow-xl transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="border-0 shadow-xl">
            <CardContent className="py-12 md:flex md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Ready to make a difference?</h2>
                <p className="text-sm text-muted-foreground mt-2">Join thousands of citizens working together to build better communities.</p>
              </div>
              <div className="mt-6 md:mt-0">
                <Link to="/login">
                  <Button variant="hero" size="lg">Get Started Now</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
