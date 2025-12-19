import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const issuesWithCoords = useMemo(
    () => issues.filter((i) => i.latitude != null && i.longitude != null),
    [issues]
  );

  const defaultCenter: [number, number] = [20.5937, 78.9629];

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

    const markersLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    // Prevent the "blank map" issue on first paint when inside a Card/layout.
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    issuesWithCoords.forEach((issue) => {
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

      marker.addTo(markersLayer);
    });

    if (issuesWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        issuesWithCoords.map((i) => [i.latitude!, i.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [24, 24] });
    } else {
      map.setView(defaultCenter, 5);
    }
  }, [issuesWithCoords, onIssueClick]);

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-border relative">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border z-[1000]">
        <p className="text-xs font-medium mb-2">Status</p>
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
      </div>
    </div>
  );
}

