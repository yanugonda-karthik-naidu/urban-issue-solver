import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  area: string | null;
  district: string | null;
  state: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  admin_remarks: string | null;
  user_name?: string;
  user_email?: string;
}

interface IssueDetailsModalProps {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IssueDetailsModal({ issue, open, onOpenChange }: IssueDetailsModalProps) {
  if (!issue) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{issue.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          {issue.photo_url && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={issue.photo_url} 
                alt={issue.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Details Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline">{issue.category}</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={
                issue.status === 'resolved' ? 'default' : 
                issue.status === 'in_progress' ? 'secondary' : 
                'outline'
              }>
                {issue.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Reported Date
              </p>
              <p className="font-medium">
                {format(new Date(issue.created_at), 'PPP')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Reporter
              </p>
              <div>
                <p className="font-medium">{issue.user_name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{issue.user_email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-sm">{issue.description}</p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </p>
            {issue.area && issue.district && issue.state ? (
              <div>
                <p className="font-medium">
                  {issue.area}, {issue.district}, {issue.state}
                </p>
                {issue.latitude !== null && issue.longitude !== null && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Coordinates: {issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View on Google Maps →
                    </a>

                    {/* Embedded OpenStreetMap preview */}
                    <div className="mt-3 rounded-md overflow-hidden border">
                      <iframe
                        title="issue-location-preview"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${issue.longitude - 0.01}%2C${issue.latitude - 0.01}%2C${issue.longitude + 0.01}%2C${issue.latitude + 0.01}&layer=mapnik&marker=${issue.latitude}%2C${issue.longitude}`}
                        style={{ width: '100%', height: '280px', border: 0 }}
                      />
                      <div className="p-2 text-xs text-muted-foreground">Preview of the report location. Click to open in OpenStreetMap.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Location not specified</p>
            )}
          </div>

          {/* Admin Remarks */}
          {issue.admin_remarks && (
            <div className="space-y-2 bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium">Admin Remarks</p>
              <p className="text-sm">{issue.admin_remarks}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
