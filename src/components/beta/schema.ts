import { z } from 'zod';

export const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Please enter your name')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]*$/, 'Name can only contain letters and spaces'),
  email: z
    .string()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Please enter a valid email format (e.g., name@domain.com)'
    ),
});

export type formValuesType = z.infer<typeof formSchema>;
