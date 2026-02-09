import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, MapPin, RefreshCw, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Prediction {
  location: string;
  area: string;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  historical_count: number;
  pending_count: number;
  risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  trend: 'increasing' | 'stable' | 'decreasing';
  predicted_issues: number;
  top_category: string;
  top_category_count: number;
  avg_severity: number;
  categories: Record<string, number>;
}

interface ForecastData {
  predictions: Prediction[];
  forecast_days: number;
  total_issues_analyzed: number;
  ai_summary: string;
  generated_at: string;
}

const riskColors: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-success/15 text-success border-success/30',
};

const riskBg: Record<string, string> = {
  critical: 'bg-destructive',
  high: 'bg-orange-500',
  medium: 'bg-warning',
  low: 'bg-success',
};

export default function Forecasting() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ForecastData | null>(null);
  const [days, setDays] = useState(30);

  const fetchForecast = async (forecastDays: number) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('predict-issues', {
        body: { forecast_days: forecastDays },
      });
      if (error) throw error;
      setData(result);
    } catch (e: any) {
      console.error('Forecast error:', e);
      toast.error('Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(days);
  }, [days]);

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Brain className="h-8 w-8 text-primary" />
                  Predictive Forecasting
                </h1>
                <p className="text-muted-foreground mt-1">AI-powered issue prediction to enable preventive governance</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchForecast(days)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Time Period Tabs */}
            <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <TabsList>
                <TabsTrigger value="7" className="gap-1"><Calendar className="h-3 w-3" />7 Days</TabsTrigger>
                <TabsTrigger value="30" className="gap-1"><Calendar className="h-3 w-3" />30 Days</TabsTrigger>
                <TabsTrigger value="90" className="gap-1"><Calendar className="h-3 w-3" />90 Days</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading && !data ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                  <Brain className="h-12 w-12 mx-auto text-primary animate-pulse" />
                  <p className="text-muted-foreground">Analyzing historical data and generating predictions...</p>
                </div>
              </div>
            ) : data ? (
              <div className="space-y-6">
                {/* AI Summary */}
                {data.ai_summary && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-primary mb-1">AI Forecast Summary</p>
                          <p className="text-sm text-foreground">{data.ai_summary}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Based on {data.total_issues_analyzed} issues analyzed • Generated {new Date(data.generated_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['critical', 'high', 'medium', 'low'] as const).map(level => {
                    const count = data.predictions.filter(p => p.risk_level === level).length;
                    return (
                      <Card key={level} className={cn("border", riskColors[level])}>
                        <CardContent className="pt-4 pb-4 text-center">
                          <p className="text-3xl font-bold">{count}</p>
                          <p className="text-xs uppercase font-medium mt-1">{level} Risk Areas</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Heatmap Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Risk Heatmap — Next {days} Days
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.predictions.map((pred, i) => (
                        <div
                          key={`${pred.district}-${pred.area}-${i}`}
                          className={cn(
                            "p-4 rounded-lg border-2 transition-all hover:scale-[1.01]",
                            riskColors[pred.risk_level],
                            pred.risk_level === 'critical' && "animate-pulse"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-lg font-bold">#{i + 1}</span>
                                <h4 className="font-semibold truncate">{pred.location}</h4>
                                <Badge variant="outline" className={riskColors[pred.risk_level]}>
                                  {pred.risk_level}
                                </Badge>
                                <TrendIcon trend={pred.trend} />
                                {pred.risk_level === 'critical' && (
                                  <AlertTriangle className="h-4 w-4 text-destructive animate-bounce" />
                                )}
                              </div>

                              <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                                <span>📊 {pred.predicted_issues} predicted issues</span>
                                <span className="text-muted-foreground">{pred.historical_count} historical</span>
                                <span className="text-muted-foreground">{pred.pending_count} pending</span>
                              </div>

                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(pred.categories).slice(0, 4).map(([cat, count]) => (
                                  <span key={cat} className="px-2 py-0.5 text-xs bg-background/50 rounded-full">
                                    {cat}: {count}
                                  </span>
                                ))}
                              </div>

                              {pred.district !== 'Unknown' && pred.area !== 'Unknown' && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {pred.area}, {pred.district}, {pred.state}
                                </p>
                              )}
                            </div>

                            <div className="w-28 shrink-0 space-y-1">
                              <p className="text-xs text-center font-medium">Risk: {pred.risk_score}/100</p>
                              <Progress value={pred.risk_score} className="h-2" />
                              <div className={cn("h-2 rounded-full", riskBg[pred.risk_level])} style={{ width: `${pred.risk_score}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}

                      {data.predictions.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Not enough historical data to generate predictions.</p>
                          <p className="text-sm mt-1">Predictions improve as more issues are reported over time.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
