ALTER TABLE public.users ADD COLUMN IF NOT EXISTS team VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.email_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    confirmation_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_confirmations_user ON public.email_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_code ON public.email_confirmations(confirmation_code);

-- 기존 사용자는 인증 완료로 처리
UPDATE public.users SET email_verified = TRUE WHERE email_verified IS NULL;
