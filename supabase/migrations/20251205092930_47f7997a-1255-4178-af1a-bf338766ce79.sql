-- Add meeting_link column to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS meeting_link text;

-- Fix RLS policies for rooms table - only host can update
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;

CREATE POLICY "Host can update their own rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = host_id));

-- Fix RLS policies for user_roles - remove self-assignment
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Only allow role insertion via the handle_new_user trigger (which runs as security definer)
CREATE POLICY "System can insert roles via trigger" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (false);

-- Fix RLS policies for feedback - only experts can insert
DROP POLICY IF EXISTS "Experts can insert feedback" ON public.feedback;

CREATE POLICY "Only experts can insert feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'expert'
  )
);