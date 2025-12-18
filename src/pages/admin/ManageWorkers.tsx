import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';

interface Worker {
  id: string;
  name: string;
  phone: string | null;
  assigned_area: string | null;
  assigned_district: string | null;
  department_id: string | null;
  created_at: string;
}

export default function ManageWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedArea, setAssignedArea] = useState('');
  const [assignedDistrict, setAssignedDistrict] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  
  const { departments } = useDepartments();

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setAssignedArea('');
    setAssignedDistrict('');
    setDepartmentId('');
    setEditingWorker(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !departmentId) {
      toast.error('Name and department are required');
      return;
    }

    try {
      if (editingWorker) {
        const { error } = await supabase
          .from('workers')
          .update({
            name: name.trim(),
            phone: phone.trim() || null,
            assigned_area: assignedArea.trim() || null,
            assigned_district: assignedDistrict.trim() || null,
            department_id: departmentId,
          })
          .eq('id', editingWorker.id);

        if (error) throw error;
        toast.success('Worker updated successfully');
      } else {
        const { error } = await supabase
          .from('workers')
          .insert({
            name: name.trim(),
            phone: phone.trim() || null,
            assigned_area: assignedArea.trim() || null,
            assigned_district: assignedDistrict.trim() || null,
            department_id: departmentId,
          });

        if (error) throw error;
        toast.success('Worker added successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchWorkers();
    } catch (error) {
      console.error('Error saving worker:', error);
      toast.error('Failed to save worker');
    }
  };

  const handleDelete = async (workerId: string) => {
    if (!confirm('Are you sure you want to delete this worker?')) return;

    try {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;
      toast.success('Worker deleted successfully');
      fetchWorkers();
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker');
    }
  };

  const openEditDialog = (worker: Worker) => {
    setEditingWorker(worker);
    setName(worker.name);
    setPhone(worker.phone || '');
    setAssignedArea(worker.assigned_area || '');
    setAssignedDistrict(worker.assigned_district || '');
    setDepartmentId(worker.department_id || '');
    setDialogOpen(true);
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'Unassigned';
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'Unknown';
  };

  const getDepartmentColor = (deptId: string | null) => {
    if (!deptId) return undefined;
    const dept = departments.find(d => d.id === deptId);
    return dept?.color || undefined;
  };

  const filteredWorkers = filterDepartment === 'all' 
    ? workers 
    : workers.filter(w => w.department_id === filterDepartment);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1">
        <AdminHeader />
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Manage Workers</h1>
              <p className="text-muted-foreground">View and manage workers across all departments</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Worker
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingWorker ? 'Edit Worker' : 'Add New Worker'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Worker name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">Assigned District</Label>
                    <Input
                      id="district"
                      value={assignedDistrict}
                      onChange={(e) => setAssignedDistrict(e.target.value)}
                      placeholder="District"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Assigned Area</Label>
                    <Input
                      id="area"
                      value={assignedArea}
                      onChange={(e) => setAssignedArea(e.target.value)}
                      placeholder="Area"
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingWorker ? 'Update Worker' : 'Add Worker'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Workers ({filteredWorkers.length})
                </CardTitle>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredWorkers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No workers found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell className="font-medium">{worker.name}</TableCell>
                        <TableCell>{worker.phone || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            style={{ borderColor: getDepartmentColor(worker.department_id) }}
                          >
                            {getDepartmentName(worker.department_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>{worker.assigned_district || '-'}</TableCell>
                        <TableCell>{worker.assigned_area || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(worker)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(worker.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
