ALTER TABLE public.email_confirmations ADD COLUMN IF NOT EXISTS verification_token UUID;
CREATE INDEX IF NOT EXISTS idx_email_confirmations_token ON public.email_confirmations(verification_token);
