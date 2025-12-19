import React, { useEffect, useState } from 'react';
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
      return '#22c55e';
    case 'in_progress':
      return '#f59e0b';
    case 'pending':
    default:
      return '#ef4444';
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
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const IssuesMap: React.FC<IssuesMapProps> = ({ issues, height = '400px', onIssueClick }) => {
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // Dynamically import react-leaflet to avoid SSR issues
    import('react-leaflet').then((mod) => {
      setMapComponents({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        Marker: mod.Marker,
        Popup: mod.Popup,
      });
    });
  }, []);

  // Filter issues with valid coordinates
  const issuesWithCoords = issues.filter(
    (issue) => issue.latitude && issue.longitude
  );

  // Calculate center based on issues or default to India
  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const center: [number, number] = issuesWithCoords.length > 0
    ? [
        issuesWithCoords.reduce((sum, i) => sum + (i.latitude || 0), 0) / issuesWithCoords.length,
        issuesWithCoords.reduce((sum, i) => sum + (i.longitude || 0), 0) / issuesWithCoords.length,
      ]
    : defaultCenter;

  const zoom = issuesWithCoords.length > 0 ? 10 : 5;

  if (!MapComponents) {
    return (
      <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-border flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-border relative">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {issuesWithCoords.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.latitude!, issue.longitude!]}
            icon={createCustomIcon(issue.status)}
            eventHandlers={{
              click: () => onIssueClick?.(issue),
            }}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-semibold text-sm">{issue.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{issue.category}</p>
                <p className="text-xs mt-1">
                  <span 
                    className="px-2 py-0.5 rounded-full text-white text-xs"
                    style={{ backgroundColor: getStatusColor(issue.status) }}
                  >
                    {issue.status || 'pending'}
                  </span>
                </p>
                {issue.area && (
                  <p className="text-xs text-gray-500 mt-1">{issue.area}, {issue.district}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border z-[1000]">
        <p className="text-xs font-medium mb-2">Status</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Resolved</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuesMap;
