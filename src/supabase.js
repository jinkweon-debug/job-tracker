import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://mugglrshrdgrpisidcur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11Z2dscnNocmRncnBpc2lkY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDIxODUsImV4cCI6MjA5NTk3ODE4NX0.11_wpfaSTfZBSI7My7UJS0tM3IBU_8wzuKH_fQXpJB8'
);
