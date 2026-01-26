-- Create trigger for auto-assigning department based on category
CREATE TRIGGER auto_assign_department_trigger
  BEFORE INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_department();

-- Create trigger for notifying department admins and super admin on new issue
CREATE TRIGGER notify_department_on_new_issue_trigger
  AFTER INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_department_on_new_issue();