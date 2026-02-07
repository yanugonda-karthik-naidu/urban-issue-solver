import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  MapPin,
  Languages,
  Clock,
  Shield,
  Camera,
  Bell,
  Users,
  FileText,
  Wifi,
  WifiOff,
  BarChart3,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Globe,
  Scale,
  Smartphone,
  Eye,
  Lock,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function Home() {
  const { t } = useTranslation();

  const coreFeatures = [
    {
      icon: Brain,
      title: 'AI-Powered Civic Guide',
      description:
        'Get instant guidance on civic issues with our intelligent chatbot. It helps you identify the right department and provides step-by-step reporting assistance.',
      badge: 'AI',
    },
    {
      icon: MapPin,
      title: 'Auto-Location Detection',
      description:
        'Automatically detect and verify your location using GPS and reverse geocoding. Ensures accurate geo-tagging for faster issue resolution.',
      badge: 'Smart',
    },
    {
      icon: Languages,
      title: 'Multilingual Support',
      description:
        'Report issues in English, Hindi, Tamil, or Telugu. Full i18n support ensures every citizen can participate in their preferred language.',
      badge: '4 Languages',
    },
    {
      icon: Clock,
      title: 'Real-Time Tracking',
      description:
        'Monitor your reported issues with live status updates. Get notified instantly when your issue status changes from pending to resolved.',
      badge: 'Live',
    },
    {
      icon: Camera,
      title: 'Photo Evidence Upload',
      description:
        'Attach photos directly from your camera or gallery. Images are securely stored and help authorities understand and prioritize issues faster.',
      badge: 'Media',
    },
    {
      icon: Shield,
      title: 'DigiLocker Verification',
      description:
        'Verify your identity through DigiLocker integration for trusted reporting. Privacy-first — we store only verification status, never raw ID data.',
      badge: 'Secure',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description:
        'Receive real-time push notifications for status updates, department responses, and resolution confirmations on your device.',
      badge: 'Alerts',
    },
    {
      icon: WifiOff,
      title: 'Offline-First PWA',
      description:
        'Works without internet. Reports are saved locally and automatically synced when connectivity is restored. Install as a native-like app.',
      badge: 'Offline',
    },
  ];

  const advancedFeatures = [
    {
      icon: Scale,
      title: 'Legal Compliance Engine',
      description: 'Automatic mapping of reported issues to relevant municipal laws and acts with compliance deadline tracking.',
    },
    {
      icon: Eye,
      title: 'Anonymous Reporting',
      description: 'Report sensitive issues anonymously. Your identity is fully protected while your voice is still heard.',
    },
    {
      icon: BarChart3,
      title: 'Department Analytics',
      description: 'Comprehensive dashboards for government officials to track resolution rates, SLA compliance, and department performance.',
    },
    {
      icon: Users,
      title: 'Community Feed',
      description: 'See what others are reporting in your area. Support issues that matter to you and build community awareness.',
    },
    {
      icon: Lock,
      title: 'Trust Score System',
      description: 'Build credibility through verified reports. Higher trust scores lead to prioritized issue handling by authorities.',
    },
    {
      icon: Zap,
      title: 'Smart Escalation',
      description: 'Unresolved issues are automatically escalated through department hierarchies based on SLA deadlines.',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Issues Reported' },
    { value: '95%', label: 'Response Rate' },
    { value: '50+', label: 'Cities Covered' },
    { value: '24/7', label: 'AI Assistance' },
  ];

  const howItWorks = [
    { step: '01', title: 'Report', description: 'Describe the issue, attach a photo, and let GPS tag the location automatically.' },
    { step: '02', title: 'Route', description: 'AI identifies the responsible department and routes your report for action.' },
    { step: '03', title: 'Track', description: 'Monitor real-time status updates with push notifications at every stage.' },
    { step: '04', title: 'Resolve', description: 'Issues are resolved by field workers and verified with photo evidence.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── HERO SECTION ─── */}
      <section className="relative overflow-hidden">
        {/* Gradient overlay background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-95" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, hsl(0 0% 100%) 1px, transparent 1px), radial-gradient(circle at 80% 70%, hsl(0 0% 100%) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative container py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-primary-foreground"
            >
              <motion.div variants={fadeUp} custom={0}>
                <Badge className="mb-6 bg-background/20 text-primary-foreground border-primary-foreground/30 backdrop-blur-sm text-sm px-4 py-1.5">
                  🏛️ Government of India — Smart City Initiative
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
              >
                {t('hero.title')}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="mt-6 text-lg sm:text-xl text-primary-foreground/85 max-w-lg leading-relaxed"
              >
                {t('hero.subtitle')} Empowering citizens to build better communities through technology-driven civic engagement.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="bg-background text-primary hover:bg-background/90 font-semibold shadow-strong text-base px-8"
                  >
                    {t('hero.cta')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/civic-guide">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-base px-8"
                  >
                    🤖 AI Civic Guide
                  </Button>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="mt-10 flex items-center gap-6 text-sm text-primary-foreground/70">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  <span>Free to Use</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  <span>No App Download</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  <span>Works Offline</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right side — Stats card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="hidden lg:block"
            >
              <div className="bg-background/10 backdrop-blur-md rounded-2xl border border-primary-foreground/20 p-8">
                <h3 className="text-primary-foreground font-bold text-lg mb-6">Platform Impact</h3>
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center p-4 rounded-xl bg-background/10">
                      <div className="text-3xl font-extrabold text-primary-foreground">{stat.value}</div>
                      <div className="text-sm text-primary-foreground/70 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-3 text-primary-foreground/80 text-sm">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  All systems operational
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR (mobile) ─── */}
      <section className="lg:hidden border-b border-border bg-muted/50">
        <div className="container py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                Simple Process
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              How It Works
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              From reporting to resolution — four simple steps to make your community better.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="relative"
              >
                <Card className="border border-border bg-card h-full hover:shadow-medium transition-shadow">
                  <CardContent className="pt-6">
                    <div className="text-5xl font-extrabold text-primary/15 mb-3">{item.step}</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
                {i < howItWorks.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute -right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/40" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CORE FEATURES GRID ─── */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                Platform Features
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t('features.title')}
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </motion.p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {coreFeatures.map((feature, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="border border-border bg-card h-full group hover:shadow-medium hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        {feature.badge}
                      </Badge>
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ADVANCED FEATURES ─── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                Government Grade
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for Transparency & Accountability
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Advanced governance features designed for Indian municipal bodies with full legal compliance.
            </motion.p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {advancedFeatures.map((feature, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mt-1">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TECHNOLOGY BADGES ─── */}
      <section className="py-16 border-y border-border">
        <div className="container">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Powered By</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: Globe, label: 'Progressive Web App' },
              { icon: Brain, label: 'Gemini AI' },
              { icon: Shield, label: 'DigiLocker' },
              { icon: Smartphone, label: 'Mobile-First' },
              { icon: Wifi, label: 'Offline-Ready' },
              { icon: FileText, label: 'Legal Compliance' },
            ].map((tech, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <tech.icon className="h-4 w-4" />
                {tech.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent p-10 md:p-16 text-center">
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, hsl(0 0% 100%) 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Make a Difference?
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-lg">
                Join thousands of citizens working together to build better, cleaner, and safer communities across India.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="bg-background text-primary hover:bg-background/90 font-semibold shadow-strong text-base px-10"
                  >
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/civic-guide">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-base"
                  >
                    Try AI Guide First
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-hero" />
                <span className="text-lg font-bold text-foreground">CivicReport</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                An initiative under the Smart Cities Mission, Government of India. Empowering citizens with technology-driven civic engagement for transparent urban governance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/civic-guide" className="hover:text-primary transition-colors">AI Civic Guide</Link></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">Report an Issue</Link></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">Track My Report</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">For Officials</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/login" className="hover:text-primary transition-colors">Admin Dashboard</Link></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">Department Analytics</Link></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">Compliance Reports</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} CivicReport — Smart Cities Mission, Government of India</p>
            <div className="flex gap-4">
              <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Accessibility</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
