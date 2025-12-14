import { useMemo } from 'react';
import { MapPin, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Issue {
  id: string;
  area: string | null;
  district: string | null;
  state: string | null;
  category: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

interface IssueHeatmapProps {
  issues: Issue[];
}

interface HotspotData {
  location: string;
  count: number;
  categories: { [key: string]: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
  pendingCount: number;
}

export function IssueHeatmap({ issues }: IssueHeatmapProps) {
  const hotspots = useMemo(() => {
    const locationMap: { [key: string]: Issue[] } = {};
    
    issues.forEach(issue => {
      const location = issue.district || issue.area || 'Unknown';
      if (!locationMap[location]) {
        locationMap[location] = [];
      }
      locationMap[location].push(issue);
    });
    
    return Object.entries(locationMap)
      .map(([location, locationIssues]): HotspotData => {
        const categories = locationIssues.reduce((acc, issue) => {
          acc[issue.category] = (acc[issue.category] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
        
        const pendingCount = locationIssues.filter(i => i.status === 'pending').length;
        const count = locationIssues.length;
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (count > 10 || pendingCount > 5) severity = 'critical';
        else if (count > 5 || pendingCount > 3) severity = 'high';
        else if (count > 2) severity = 'medium';
        
        return { location, count, categories, severity, pendingCount };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [issues]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/20 border-destructive text-destructive';
      case 'high': return 'bg-orange-500/20 border-orange-500 text-orange-600';
      case 'medium': return 'bg-warning/20 border-warning text-warning';
      default: return 'bg-success/20 border-success text-success';
    }
  };

  const getSeverityGlow = (severity: string) => {
    switch (severity) {
      case 'critical': return 'shadow-destructive/50';
      case 'high': return 'shadow-orange-500/50';
      case 'medium': return 'shadow-warning/50';
      default: return 'shadow-success/50';
    }
  };

  const maxCount = Math.max(...hotspots.map(h => h.count), 1);

  return (
    <div className="space-y-4">
      {/* Header with legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Issue Hotspots</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-success/50" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-warning/50" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500/50" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-destructive/50" />
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid gap-3">
        {hotspots.map((hotspot, index) => (
          <div
            key={hotspot.location}
            className={cn(
              "relative p-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
              getSeverityColor(hotspot.severity),
              hotspot.severity === 'critical' && "animate-pulse"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">#{index + 1}</span>
                  <h4 className="font-semibold">{hotspot.location}</h4>
                  {hotspot.severity === 'critical' && (
                    <AlertTriangle className="h-4 w-4 text-destructive animate-bounce" />
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="font-medium">{hotspot.count} issues</span>
                  <span className="text-muted-foreground">
                    {hotspot.pendingCount} pending
                  </span>
                </div>
                
                {/* Categories breakdown */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(hotspot.categories).slice(0, 3).map(([cat, count]) => (
                    <span 
                      key={cat} 
                      className="px-2 py-0.5 text-xs bg-background/50 rounded-full"
                    >
                      {cat}: {count}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Visual bar */}
              <div className="w-24 h-8 bg-background/30 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    hotspot.severity === 'critical' ? 'bg-destructive' :
                    hotspot.severity === 'high' ? 'bg-orange-500' :
                    hotspot.severity === 'medium' ? 'bg-warning' : 'bg-success'
                  )}
                  style={{ width: `${(hotspot.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        
        {hotspots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No location data available</p>
          </div>
        )}
      </div>

      {/* AI Insights */}
      {hotspots.length > 0 && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">AI Insight</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {hotspots[0]?.severity === 'critical' 
              ? `⚠️ Critical attention needed in ${hotspots[0].location} with ${hotspots[0].pendingCount} pending issues. Consider deploying additional resources.`
              : hotspots[0]?.severity === 'high'
              ? `📊 ${hotspots[0].location} shows elevated activity. Monitor closely for escalation.`
              : `✅ Issue distribution is balanced. Current hotspot: ${hotspots[0]?.location || 'None'}`
            }
          </p>
        </div>
      )}
    </div>
  );
}
