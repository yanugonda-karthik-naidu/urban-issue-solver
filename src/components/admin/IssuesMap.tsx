import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Layers, Filter, Flame, Search, Download, FileText, Pencil, X } from 'lucide-react';
import { jsPDF } from 'jspdf';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Extend L to include heat
declare module 'leaflet' {
  function heatLayer(latlngs: Array<[number, number, number?]>, options?: any): any;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  status: string | null;
  category: string;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
  district: string | null;
}

interface IssuesMapProps {
  issues: Issue[];
  height?: string;
  onIssueClick?: (issue: Issue) => void;
}

const STATUS_OPTIONS = ['pending', 'in_progress', 'resolved'] as const;
const CATEGORY_OPTIONS = ['Roads', 'Sanitation', 'Electricity', 'Water', 'Traffic', 'Municipality', 'Other'] as const;

const getStatusColor = (status: string | null) => {
  switch (status) {
    case 'resolved':
      return 'hsl(var(--success))';
    case 'in_progress':
      return 'hsl(var(--warning))';
    case 'pending':
    default:
      return 'hsl(var(--destructive))';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
    case 'pending':
    default:
      return 'Pending';
  }
};

const createCustomIcon = (status: string | null) => {
  const color = getStatusColor(status);
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      border: 3px solid hsl(var(--background));
      box-shadow: 0 2px 10px hsl(0 0% 0% / 0.25);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function IssuesMap({ issues, height = '400px', onIssueClick }: IssuesMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatLayerRef = useRef<any>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  // Toggle states
  const [showClustering, setShowClustering] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);

  // Filter states
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set(STATUS_OPTIONS));
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set(CATEGORY_OPTIONS));
  const [searchQuery, setSearchQuery] = useState('');
  const [drawnBounds, setDrawnBounds] = useState<L.LatLngBounds | null>(null);

  const issuesWithCoords = useMemo(
    () => issues.filter((i) => i.latitude != null && i.longitude != null),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    return issuesWithCoords.filter((issue) => {
      const statusMatch = statusFilters.has(issue.status || 'pending');
      const categoryMatch = categoryFilters.has(issue.category) || categoryFilters.has('Other');
      
      // Search filter
      const searchLower = searchQuery.toLowerCase().trim();
      const searchMatch = !searchLower || 
        issue.title.toLowerCase().includes(searchLower) ||
        (issue.area?.toLowerCase().includes(searchLower)) ||
        (issue.district?.toLowerCase().includes(searchLower));
      
      // Drawn area filter
      const boundsMatch = !drawnBounds || 
        drawnBounds.contains(L.latLng(issue.latitude!, issue.longitude!));
      
      return statusMatch && categoryMatch && searchMatch && boundsMatch;
    });
  }, [issuesWithCoords, statusFilters, categoryFilters, searchQuery, drawnBounds]);

  const defaultCenter: [number, number] = [20.5937, 78.9629];

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['ID', 'Title', 'Category', 'Status', 'Area', 'District', 'Latitude', 'Longitude'];
    const rows = filteredIssues.map(issue => [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      issue.category,
      issue.status || 'pending',
      issue.area || '',
      issue.district || '',
      issue.latitude?.toString() || '',
      issue.longitude?.toString() || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `issues-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredIssues]);

  // Export to PDF
  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.text('Issues Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total Issues: ${filteredIssues.length}`, pageWidth / 2, 34, { align: 'center' });
    
    // Table header
    let y = 45;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Title', 14, y);
    doc.text('Category', 80, y);
    doc.text('Status', 120, y);
    doc.text('Location', 150, y);
    
    doc.setFont('helvetica', 'normal');
    y += 8;
    
    filteredIssues.forEach((issue, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      
      const title = issue.title.length > 35 ? issue.title.substring(0, 32) + '...' : issue.title;
      const location = [issue.area, issue.district].filter(Boolean).join(', ');
      const locationTrunc = location.length > 25 ? location.substring(0, 22) + '...' : location;
      
      doc.text(title, 14, y);
      doc.text(issue.category, 80, y);
      doc.text(getStatusLabel(issue.status || 'pending'), 120, y);
      doc.text(locationTrunc || '-', 150, y);
      
      y += 6;
    });
    
    doc.save(`issues-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [filteredIssues]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(defaultCenter, 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Create marker cluster group
    const markersLayer = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 10) size = 'medium';
        if (count > 50) size = 'large';
        
        return L.divIcon({
          html: `<div class="cluster-icon cluster-${size}">${count}</div>`,
          className: 'marker-cluster-custom',
          iconSize: L.point(40, 40),
        });
      },
    });

    map.addLayer(markersLayer);

    // Create drawn items layer for draw control
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    // Prevent the "blank map" issue on first paint when inside a Card/layout.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      heatLayerRef.current = null;
      drawnItemsRef.current = null;
      drawControlRef.current = null;
    };
  }, []);

  // Handle draw mode toggle
  useEffect(() => {
    const map = mapRef.current;
    const drawnItems = drawnItemsRef.current;
    if (!map || !drawnItems) return;

    if (isDrawMode && !drawControlRef.current) {
      const drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
          polyline: false,
          polygon: {},
          circle: false,
          circlemarker: false,
          marker: false,
          rectangle: {},
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });
      
      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      // Handle draw events
      const onCreated = (e: any) => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        setDrawnBounds(e.layer.getBounds());
      };

      const onDeleted = () => {
        setDrawnBounds(null);
      };

      map.on(L.Draw.Event.CREATED, onCreated);
      map.on(L.Draw.Event.DELETED, onDeleted);

      return () => {
        map.off(L.Draw.Event.CREATED, onCreated);
        map.off(L.Draw.Event.DELETED, onDeleted);
      };
    } else if (!isDrawMode && drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
      drawnItems.clearLayers();
      setDrawnBounds(null);
    }
  }, [isDrawMode]);

  // Update markers and heatmap
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear existing layers
    markersLayer.clearLayers();
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Add markers if clustering is enabled and heatmap is disabled
    if (!showHeatmap) {
      filteredIssues.forEach((issue) => {
        const marker = L.marker([issue.latitude!, issue.longitude!], {
          icon: createCustomIcon(issue.status),
        });

        const statusLabel = issue.status || 'pending';
        const popupHtml = `
          <div style="font-family: ui-sans-serif, system-ui; padding: 4px 2px; max-width: 220px;">
            <div style="font-weight: 700; font-size: 12px; line-height: 1.2;">
              ${issue.title}
            </div>
            <div style="font-size: 12px; opacity: 0.75; margin-top: 4px;">
              ${issue.category}
            </div>
            <div style="margin-top: 6px;">
              <span style="
                display: inline-block;
                padding: 2px 8px;
                border-radius: 9999px;
                font-size: 11px;
                color: hsl(var(--primary-foreground));
                background: ${getStatusColor(issue.status)};
              ">${statusLabel}</span>
            </div>
            ${issue.area ? `<div style="font-size: 12px; opacity: 0.7; margin-top: 6px;">${issue.area}${issue.district ? `, ${issue.district}` : ''}</div>` : ''}
          </div>
        `;

        marker.bindPopup(popupHtml);

        marker.on('click', () => {
          onIssueClick?.(issue);
        });

        if (showClustering) {
          markersLayer.addLayer(marker);
        } else {
          marker.addTo(map);
        }
      });
    }

    // Add heatmap if enabled
    if (showHeatmap && filteredIssues.length > 0) {
      const heatData: [number, number, number][] = filteredIssues.map((issue) => [
        issue.latitude!,
        issue.longitude!,
        1, // intensity
      ]);

      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.4: 'blue',
          0.6: 'cyan',
          0.7: 'lime',
          0.8: 'yellow',
          1.0: 'red',
        },
      }).addTo(map);
    }

    // Fit bounds only if no drawn bounds (don't override user selection)
    if (!drawnBounds && filteredIssues.length > 0) {
      const bounds = L.latLngBounds(
        filteredIssues.map((i) => [i.latitude!, i.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [24, 24] });
    } else if (!drawnBounds && filteredIssues.length === 0) {
      map.setView(defaultCenter, 5);
    }
  }, [filteredIssues, onIssueClick, showClustering, showHeatmap, drawnBounds]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const clearDrawnArea = () => {
    drawnItemsRef.current?.clearLayers();
    setDrawnBounds(null);
  };

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-border relative">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Search Box */}
      <div className="absolute top-4 left-4 z-[1000] w-64">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 bg-background/95 backdrop-blur-sm border-border text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border z-[1000] space-y-3 max-w-[200px]">
        {/* Export Buttons */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export ({filteredIssues.length})
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="h-7 text-xs flex-1"
              disabled={filteredIssues.length === 0}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="h-7 text-xs flex-1"
              disabled={filteredIssues.length === 0}
            >
              <FileText className="h-3 w-3 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        {/* Draw Area Toggle */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <Label htmlFor="drawMode" className="text-xs cursor-pointer flex items-center gap-1">
            <Pencil className="h-3 w-3" />
            Draw Area
          </Label>
          <Switch
            id="drawMode"
            checked={isDrawMode}
            onCheckedChange={setIsDrawMode}
            className="scale-75"
          />
        </div>
        {drawnBounds && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDrawnArea}
            className="h-6 text-xs w-full text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Clear Selection
          </Button>
        )}

        {/* View Toggles */}
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            View Options
          </p>
          
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="clustering" className="text-xs cursor-pointer">Clustering</Label>
            <Switch
              id="clustering"
              checked={showClustering}
              onCheckedChange={setShowClustering}
              disabled={showHeatmap}
              className="scale-75"
            />
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="heatmap" className="text-xs cursor-pointer flex items-center gap-1">
              <Flame className="h-3 w-3" />
              Heatmap
            </Label>
            <Switch
              id="heatmap"
              checked={showHeatmap}
              onCheckedChange={setShowHeatmap}
              className="scale-75"
            />
          </div>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs font-medium hover:text-primary transition-colors w-full"
        >
          <Filter className="h-3.5 w-3.5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-3 pt-2 border-t border-border">
            {/* Status Filters */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Status</p>
              {STATUS_OPTIONS.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={statusFilters.has(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                    className="h-3.5 w-3.5"
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getStatusColor(status) }}
                    />
                    {getStatusLabel(status)}
                  </label>
                </div>
              ))}
            </div>

            {/* Category Filters */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Category</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {CATEGORY_OPTIONS.map((category) => (
                  <div key={category} className="flex items-center gap-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={categoryFilters.has(category)}
                      onCheckedChange={() => toggleCategoryFilter(category)}
                      className="h-3.5 w-3.5"
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-xs cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border z-[1000]">
        <p className="text-xs font-medium mb-2">Status Legend</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs">Resolved</span>
          </div>
        </div>
        {showHeatmap && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs font-medium mb-1">Heatmap Intensity</p>
            <div className="h-2 rounded-full" style={{
              background: 'linear-gradient(to right, blue, cyan, lime, yellow, red)'
            }} />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
      </div>

      {/* Cluster Styles */}
      <style>{`
        .marker-cluster-custom {
          background: transparent;
        }
        .cluster-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 600;
          font-size: 12px;
          color: hsl(var(--primary-foreground));
          box-shadow: 0 2px 10px hsl(0 0% 0% / 0.3);
        }
        .cluster-small {
          background: hsl(var(--primary));
          width: 32px;
          height: 32px;
        }
        .cluster-medium {
          background: hsl(var(--warning));
          width: 38px;
          height: 38px;
        }
        .cluster-large {
          background: hsl(var(--destructive));
          width: 44px;
          height: 44px;
        }
        .leaflet-draw-toolbar a {
          background-color: hsl(var(--background)) !important;
          border-color: hsl(var(--border)) !important;
        }
        .leaflet-draw-toolbar a:hover {
          background-color: hsl(var(--muted)) !important;
        }
      `}</style>
    </div>
  );
}
