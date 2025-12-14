import { z } from 'zod';

// Valid categories for issue reports
export const VALID_CATEGORIES = ['roads', 'garbage', 'water', 'electricity', 'other'] as const;

// Issue form validation schema
export const IssueFormSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),
  category: z.enum(VALID_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid category' })
  }),
  area: z.string().max(100, 'Area must be less than 100 characters').optional().or(z.literal('')),
  district: z.string().max(100, 'District must be less than 100 characters').optional().or(z.literal('')),
  state: z.string().max(100, 'State must be less than 100 characters').optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

// Profile validation schema
export const ProfileSchema = z.object({
  full_name: z.string()
    .max(100, 'Name must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^[0-9+\-\s()]{0,20}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  area: z.string().max(100, 'Area must be less than 100 characters').optional().or(z.literal('')),
  district: z.string().max(100, 'District must be less than 100 characters').optional().or(z.literal('')),
  state: z.string().max(100, 'State must be less than 100 characters').optional().or(z.literal('')),
});

// Admin remarks validation schema
export const AdminRemarksSchema = z.string()
  .max(2000, 'Remarks must be less than 2000 characters')
  .optional()
  .or(z.literal(''));

// Notification validation schema (for edge function)
export const NotificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  title: z.string().min(1).max(200, 'Title must be less than 200 characters'),
  message: z.string().min(1).max(500, 'Message must be less than 500 characters'),
  type: z.enum(['new_issue', 'status_update'], {
    errorMap: () => ({ message: 'Invalid notification type' })
  }),
  issue_id: z.string().uuid('Invalid issue ID').optional(),
});

export const NotificationsArraySchema = z.array(NotificationSchema);

export type IssueFormData = z.infer<typeof IssueFormSchema>;
export type ProfileData = z.infer<typeof ProfileSchema>;
export type NotificationData = z.infer<typeof NotificationSchema>;
