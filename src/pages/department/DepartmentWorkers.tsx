import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Users } from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface Worker {
  id: string;
  name: string;
  phone: string | null;
  assigned_area: string | null;
  assigned_district: string | null;
  department_id: string;
  created_at: string;
}

export default function DepartmentWorkers() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedArea, setAssignedArea] = useState('');
  const [assignedDistrict, setAssignedDistrict] = useState('');

  const { departments, getDepartmentById } = useDepartments();
  const { adminInfo, isSuperAdmin, loading: adminLoading } = useAdminAccess();

  useEffect(() => {
    if (!adminLoading && adminInfo) {
      if (isSuperAdmin) {
        navigate('/admin');
        return;
      }
      
      if (adminInfo.department_id) {
        const dept = getDepartmentById(adminInfo.department_id);
        setDepartment(dept || null);
        fetchWorkers(adminInfo.department_id);
      }
    }
  }, [adminInfo, adminLoading, departments]);

  const fetchWorkers = async (deptId: string) => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('department_id', deptId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkers((data as Worker[]) || []);
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
    setEditingWorker(null);
  };

  const handleAddWorker = async () => {
    if (!name.trim()) {
      toast.error('Worker name is required');
      return;
    }

    try {
      const { error } = await supabase.from('workers').insert({
        name: name.trim(),
        phone: phone.trim() || null,
        assigned_area: assignedArea.trim() || null,
        assigned_district: assignedDistrict.trim() || null,
        department_id: adminInfo!.department_id,
      });

      if (error) throw error;
      toast.success('Worker added successfully!');
      resetForm();
      setIsAddDialogOpen(false);
      fetchWorkers(adminInfo!.department_id!);
    } catch (error) {
      console.error('Error adding worker:', error);
      toast.error('Failed to add worker');
    }
  };

  const handleUpdateWorker = async () => {
    if (!editingWorker || !name.trim()) {
      toast.error('Worker name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('workers')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          assigned_area: assignedArea.trim() || null,
          assigned_district: assignedDistrict.trim() || null,
        })
        .eq('id', editingWorker.id);

      if (error) throw error;
      toast.success('Worker updated successfully!');
      resetForm();
      fetchWorkers(adminInfo!.department_id!);
    } catch (error) {
      console.error('Error updating worker:', error);
      toast.error('Failed to update worker');
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    if (!confirm('Are you sure you want to delete this worker?')) return;

    try {
      const { error } = await supabase.from('workers').delete().eq('id', workerId);
      if (error) throw error;
      toast.success('Worker deleted successfully!');
      fetchWorkers(adminInfo!.department_id!);
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
  };

  if (loading || adminLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">{department?.name} Workers</h1>
                <p className="text-muted-foreground">Manage workers in your department</p>
              </div>
              
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Worker
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Worker</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
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
                      <Label htmlFor="area">Assigned Area</Label>
                      <Input
                        id="area"
                        value={assignedArea}
                        onChange={(e) => setAssignedArea(e.target.value)}
                        placeholder="e.g., Ward 5, Sector 12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">Assigned District</Label>
                      <Input
                        id="district"
                        value={assignedDistrict}
                        onChange={(e) => setAssignedDistrict(e.target.value)}
                        placeholder="e.g., Chennai, Coimbatore"
                      />
                    </div>
                    <Button onClick={handleAddWorker} className="w-full">
                      Add Worker
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {workers.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No workers added yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add workers to assign issues to them</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-soft">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Assigned Area</TableHead>
                        <TableHead>Assigned District</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workers.map((worker) => (
                        <TableRow key={worker.id}>
                          <TableCell className="font-medium">{worker.name}</TableCell>
                          <TableCell>{worker.phone || '-'}</TableCell>
                          <TableCell>{worker.assigned_area || '-'}</TableCell>
                          <TableCell>{worker.assigned_district || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(worker)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Worker</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-name">Name *</Label>
                                      <Input
                                        id="edit-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Worker name"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-phone">Phone</Label>
                                      <Input
                                        id="edit-phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Phone number"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-area">Assigned Area</Label>
                                      <Input
                                        id="edit-area"
                                        value={assignedArea}
                                        onChange={(e) => setAssignedArea(e.target.value)}
                                        placeholder="e.g., Ward 5, Sector 12"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="edit-district">Assigned District</Label>
                                      <Input
                                        id="edit-district"
                                        value={assignedDistrict}
                                        onChange={(e) => setAssignedDistrict(e.target.value)}
                                        placeholder="e.g., Chennai, Coimbatore"
                                      />
                                    </div>
                                    <Button onClick={handleUpdateWorker} className="w-full">
                                      Update Worker
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteWorker(worker.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
