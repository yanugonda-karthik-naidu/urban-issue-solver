import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff, History, Timer, Settings, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { syncQueue, QueuedRequest } from '@/lib/syncQueue';
import { syncHistory, SyncHistoryEntry } from '@/lib/syncHistory';
import { syncSettings, SyncSettings } from '@/lib/syncSettings';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

const SyncStatus = () => {
  const navigate = useNavigate();
  const { isOnline, isSyncing, nextRetryAt, isAutoRetryEnabled, processQueue, cancelAutoRetry } = useBackgroundSync();
  const [requests, setRequests] = useState<QueuedRequest[]>([]);
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [settings, setSettings] = useState<SyncSettings>(syncSettings.getSettings());

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

  const fetchHistory = async () => {
    try {
      const entries = await syncHistory.getHistory();
      setHistory(entries);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchHistory();

    const handleQueueUpdate = () => fetchRequests();
    const handleHistoryUpdate = () => fetchHistory();
    
    window.addEventListener('sync-queue-updated', handleQueueUpdate);
    window.addEventListener('sync-history-updated', handleHistoryUpdate);
    
    return () => {
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
      window.removeEventListener('sync-history-updated', handleHistoryUpdate);
    };
  }, []);

  // Countdown timer for next retry
  useEffect(() => {
    if (!nextRetryAt) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = nextRetryAt.getTime() - now;
      
      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const seconds = Math.ceil(diff / 1000);
      if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        setCountdown(`${minutes}m ${remainingSeconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [nextRetryAt]);

  const handleRetryAll = async () => {
    triggerHaptic('medium');
    const beforeCount = requests.length;
    await processQueue();
    await fetchRequests();
    const afterCount = requests.length;
    const syncedCount = beforeCount - afterCount;
    
    // Log to history
    if (syncedCount > 0 || afterCount > 0) {
      await syncHistory.addEntry({
        type: afterCount === 0 ? 'success' : syncedCount > 0 ? 'partial' : 'failure',
        syncedCount,
        failedCount: afterCount,
        details: `Synced ${syncedCount} request${syncedCount !== 1 ? 's' : ''}${afterCount > 0 ? `, ${afterCount} failed` : ''}`,
      });
    }
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
        
        // Log success
        await syncHistory.addEntry({
          type: 'success',
          syncedCount: 1,
          failedCount: 0,
          details: `${request.method} ${new URL(request.url).pathname}`,
        });
      } else {
        toast.error('Request failed');
        
        // Log failure
        await syncHistory.addEntry({
          type: 'failure',
          syncedCount: 0,
          failedCount: 1,
          details: `${request.method} ${new URL(request.url).pathname} - Status ${response.status}`,
        });
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

  const handleClearHistory = async () => {
    triggerHaptic('light');
    await syncHistory.clearHistory();
    toast.success('History cleared');
  };

  const getRequestStatus = (request: QueuedRequest) => {
    if (request.retryCount >= settings.maxRetries) {
      return { status: 'failed', color: 'destructive' as const, icon: XCircle };
    }
    if (request.retryCount > 0) {
      return { status: 'retrying', color: 'secondary' as const, icon: AlertTriangle };
    }
    return { status: 'pending', color: 'default' as const, icon: Clock };
  };

  const getHistoryIcon = (type: SyncHistoryEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failure': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'partial': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    }
  };

  const handleSaveSettings = () => {
    triggerHaptic('light');
    syncSettings.saveSettings(settings);
    toast.success('Settings saved');
  };

  const handleResetSettings = () => {
    triggerHaptic('light');
    const defaults = syncSettings.getDefaults();
    setSettings(defaults);
    syncSettings.resetToDefaults();
    toast.success('Settings reset to defaults');
  };

  const pendingCount = requests.filter(r => r.retryCount < settings.maxRetries).length;
  const failedCount = requests.filter(r => r.retryCount >= settings.maxRetries).length;

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

        {/* Tabs for Queue, History, and Settings */}
        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Queue {requests.length > 0 && `(${requests.length})`}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {/* Next Retry Countdown */}
            {countdown && isAutoRetryEnabled && (
              <Card className="border-amber-500/50 bg-amber-500/10">
                <CardContent className="py-3 flex items-center gap-3">
                  <Timer className="h-5 w-5 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Auto-retry scheduled</p>
                    <p className="text-xs text-muted-foreground">
                      Next attempt in {countdown}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={cancelAutoRetry}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRetryAll}
                      disabled={!isOnline || isSyncing}
                    >
                      Retry Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auto-retry disabled notice */}
            {!isAutoRetryEnabled && requests.length > 0 && (
              <Card className="border-muted">
                <CardContent className="py-3 flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Auto-retry disabled</p>
                    <p className="text-xs text-muted-foreground">
                      Click "Retry All" to re-enable automatic retries
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
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
                  <ScrollArea className="h-[350px]">
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
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* History Actions */}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearHistory}
                disabled={history.length === 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear History
              </Button>
            </div>

            {/* History List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sync History</CardTitle>
                <CardDescription>
                  {history.length === 0 
                    ? 'No sync history yet' 
                    : `${history.length} sync operation${history.length === 1 ? '' : 's'} recorded`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No sync history yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sync operations will appear here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {history.map((entry) => (
                        <div 
                          key={entry.id} 
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        >
                          {getHistoryIcon(entry.type)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={
                                  entry.type === 'success' ? 'default' : 
                                  entry.type === 'failure' ? 'destructive' : 
                                  'secondary'
                                } 
                                className="text-xs"
                              >
                                {entry.type === 'success' ? 'Success' : 
                                 entry.type === 'failure' ? 'Failed' : 
                                 'Partial'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {entry.syncedCount > 0 && `${entry.syncedCount} synced`}
                                {entry.syncedCount > 0 && entry.failedCount > 0 && ', '}
                                {entry.failedCount > 0 && `${entry.failedCount} failed`}
                              </span>
                            </div>
                            {entry.details && (
                              <p className="text-sm truncate">{entry.details}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(entry.timestamp, 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Retry Settings</CardTitle>
                <CardDescription>
                  Configure automatic retry behavior for failed sync requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Maximum Retry Attempts</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxRetries}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      maxRetries: Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Requests will be discarded after this many failed attempts (1-10)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="baseDelay">Initial Retry Delay (seconds)</Label>
                  <Input
                    id="baseDelay"
                    type="number"
                    min={1}
                    max={60}
                    value={Math.round(settings.baseDelayMs / 1000)}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      baseDelayMs: Math.max(1000, Math.min(60000, (parseInt(e.target.value) || 1) * 1000))
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Starting delay before first retry, doubles with each attempt (1-60 seconds)
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="maxDelay">Maximum Retry Delay (seconds)</Label>
                  <Input
                    id="maxDelay"
                    type="number"
                    min={10}
                    max={300}
                    value={Math.round(settings.maxDelayMs / 1000)}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      maxDelayMs: Math.max(10000, Math.min(300000, (parseInt(e.target.value) || 10) * 1000))
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum delay between retry attempts (10-300 seconds)
                  </p>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={handleSaveSettings} className="flex-1">
                    Save Settings
                  </Button>
                  <Button variant="outline" onClick={handleResetSettings} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SyncStatus;
