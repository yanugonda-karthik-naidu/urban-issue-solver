import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { syncQueue, QueuedRequest } from '@/lib/syncQueue';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const MAX_RETRIES = 3;

const SyncStatus = () => {
  const navigate = useNavigate();
  const { isOnline, isSyncing, processQueue } = useBackgroundSync();
  const [requests, setRequests] = useState<QueuedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const queue = await syncQueue.getQueue();
      setRequests(queue);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const handleQueueUpdate = () => fetchRequests();
    window.addEventListener('sync-queue-updated', handleQueueUpdate);
    
    return () => {
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
    };
  }, []);

  const handleRetryAll = async () => {
    triggerHaptic('medium');
    await processQueue();
    await fetchRequests();
  };

  const handleRetryOne = async (request: QueuedRequest) => {
    triggerHaptic('light');
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      if (response.ok) {
        await syncQueue.removeFromQueue(request.id);
        triggerHaptic('success');
        toast.success('Request synced successfully');
      } else {
        toast.error('Request failed');
      }
    } catch (error) {
      toast.error('Network error - will retry later');
    }
    await fetchRequests();
  };

  const handleRemove = async (id: string) => {
    triggerHaptic('light');
    await syncQueue.removeFromQueue(id);
    await fetchRequests();
    toast.success('Request removed from queue');
  };

  const handleClearAll = async () => {
    triggerHaptic('medium');
    await syncQueue.clearQueue();
    await fetchRequests();
    toast.success('Queue cleared');
  };

  const getRequestStatus = (request: QueuedRequest) => {
    if (request.retryCount >= MAX_RETRIES) {
      return { status: 'failed', color: 'destructive' as const, icon: XCircle };
    }
    if (request.retryCount > 0) {
      return { status: 'retrying', color: 'secondary' as const, icon: AlertTriangle };
    }
    return { status: 'pending', color: 'default' as const, icon: Clock };
  };

  const pendingCount = requests.filter(r => r.retryCount < MAX_RETRIES).length;
  const failedCount = requests.filter(r => r.retryCount >= MAX_RETRIES).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Sync Status</h1>
            <p className="text-sm text-muted-foreground">
              Manage pending and failed sync requests
            </p>
          </div>
          <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{requests.length}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-destructive">{failedCount}</div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-6">
          <Button 
            onClick={handleRetryAll} 
            disabled={!isOnline || isSyncing || requests.length === 0}
            className="flex-1 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Retry All'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearAll}
            disabled={requests.length === 0}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        </div>

        {/* Request List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Requests</CardTitle>
            <CardDescription>
              {requests.length === 0 
                ? 'No pending requests' 
                : `${requests.length} request${requests.length === 1 ? '' : 's'} in queue`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <p className="text-muted-foreground">All synced!</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {requests.map((request) => {
                    const { status, color, icon: StatusIcon } = getRequestStatus(request);
                    const url = new URL(request.url);
                    
                    return (
                      <div 
                        key={request.id} 
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <StatusIcon className={`h-5 w-5 mt-0.5 ${
                          status === 'failed' ? 'text-destructive' : 
                          status === 'retrying' ? 'text-amber-500' : 
                          'text-muted-foreground'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {request.method}
                            </Badge>
                            <Badge variant={color} className="text-xs">
                              {status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {url.pathname}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(request.timestamp, { addSuffix: true })}
                            {request.retryCount > 0 && ` • ${request.retryCount} retries`}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRetryOne(request)}
                            disabled={!isOnline}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemove(request.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SyncStatus;
