-- Add column to track if signature has been released by admin
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS assinatura_liberada boolean DEFAULT false;