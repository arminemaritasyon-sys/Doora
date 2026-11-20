ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS work_started_at timestamptz;
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON public.user_blocks(blocked_id);
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL,
  reported_user_id text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  category varchar(60) NOT NULL,
  details text NOT NULL DEFAULT '',
  status varchar(30) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reported_user_id IS NOT NULL OR task_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS user_reports_status_created_idx ON public.user_reports(status, created_at DESC);
CREATE TABLE IF NOT EXISTS public.task_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE CASCADE,
  opened_by text NOT NULL,
  reason varchar(80) NOT NULL,
  details text NOT NULL DEFAULT '',
  status varchar(30) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS task_disputes_status_created_idx ON public.task_disputes(status, created_at DESC);
CREATE OR REPLACE FUNCTION public.doora_complete_task(p_owner_id text, p_task_id uuid)
RETURNS TABLE(released_amount numeric, provider_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_task public.tasks%ROWTYPE; v_offer public.offers%ROWTYPE;
BEGIN
 SELECT t.* INTO v_task FROM public.tasks AS t WHERE t.id=p_task_id FOR UPDATE;
 IF NOT FOUND OR v_task.owner_id<>p_owner_id OR v_task.status NOT IN ('awaiting_confirmation','assigned','in_progress') OR v_task.assigned_offer_id IS NULL THEN
   RAISE EXCEPTION 'İş tamamlanma onayına uygun değil';
 END IF;
 SELECT o.* INTO v_offer FROM public.offers AS o WHERE o.id=v_task.assigned_offer_id;
 UPDATE public.wallet_accounts AS wa SET held_balance=wa.held_balance-v_offer.amount,updated_at=now()
 WHERE wa.user_id=p_owner_id AND wa.held_balance>=v_offer.amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'Emanet bakiyesi bulunamadı'; END IF;
 INSERT INTO public.wallet_accounts(user_id,mode) VALUES(v_offer.user_id,'test') ON CONFLICT(user_id) DO NOTHING;
 UPDATE public.wallet_accounts AS wa SET available_balance=wa.available_balance+v_offer.amount,updated_at=now()
 WHERE wa.user_id=v_offer.user_id;
 UPDATE public.tasks AS t SET status='completed',updated_at=now() WHERE t.id=p_task_id;
 INSERT INTO public.wallet_transactions(user_id,task_id,related_user_id,type,amount,status,description)
 VALUES
 (p_owner_id,p_task_id,v_offer.user_id,'escrow_release',v_offer.amount,'completed','Emanet tutar iş tamamlanınca serbest bırakıldı'),
 (v_offer.user_id,p_task_id,p_owner_id,'escrow_release',v_offer.amount,'completed','Tamamlanan işin ödemesi cüzdana aktarıldı');
 RETURN QUERY SELECT v_offer.amount,wa.available_balance FROM public.wallet_accounts AS wa WHERE wa.user_id=v_offer.user_id;
END
$function$;