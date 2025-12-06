-- Update RLS policy on rooms to allow admin to create rooms
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.rooms;

CREATE POLICY "Admins can create rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update policy for admins to update any room
DROP POLICY IF EXISTS "Host can update their own rooms" ON public.rooms;

CREATE POLICY "Admins and hosts can update rooms" 
ON public.rooms 
FOR UPDATE 
USING (
  public.has_role(auth.uid(), 'admin') 
  OR auth.uid() = (SELECT profiles.user_id FROM profiles WHERE profiles.id = rooms.host_id)
);

-- Allow admins to delete rooms if needed
CREATE POLICY "Admins can delete rooms"
ON public.rooms
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Also ensure all authenticated users can still view rooms
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;

CREATE POLICY "Authenticated users can view rooms"
ON public.rooms
FOR SELECT
USING (auth.uid() IS NOT NULL);