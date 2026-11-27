ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS featured_until timestamptz;
CREATE INDEX IF NOT EXISTS tasks_featured_until_idx ON public.tasks(featured_until DESC) WHERE featured_until IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.task_promotions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
 user_id text NOT NULL,
 amount numeric(12,2) NOT NULL CHECK (amount > 0),
 starts_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz NOT NULL,
 idempotency_key text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_promotions_task_ends_idx ON public.task_promotions(task_id,ends_at DESC);
CREATE OR REPLACE FUNCTION public.doora_feature_task(p_user_id text,p_task_id uuid,p_amount numeric,p_key text)
RETURNS TABLE(featured_until timestamptz,available_balance numeric,already_processed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_task public.tasks%ROWTYPE; v_promotion public.task_promotions%ROWTYPE; v_balance numeric;
BEGIN
 IF p_amount <> 25 THEN RAISE EXCEPTION 'Öne çıkarma ücreti 25 TL olmalı'; END IF;
 SELECT * INTO v_task FROM public.tasks WHERE id=p_task_id FOR UPDATE;
 IF NOT FOUND OR v_task.owner_id<>p_user_id OR v_task.status NOT IN ('open','paused') THEN RAISE EXCEPTION 'Bu ilan öne çıkarılamıyor'; END IF;
 SELECT * INTO v_promotion FROM public.task_promotions WHERE idempotency_key=p_key;
 IF FOUND THEN
  IF v_promotion.user_id<>p_user_id OR v_promotion.task_id<>p_task_id THEN RAISE EXCEPTION 'İşlem anahtarı geçersiz'; END IF;
  SELECT wa.available_balance INTO v_balance FROM public.wallet_accounts wa WHERE wa.user_id=p_user_id;
  RETURN QUERY SELECT v_promotion.ends_at,v_balance,true; RETURN;
 END IF;
 INSERT INTO public.wallet_accounts(user_id,mode) VALUES(p_user_id,'test') ON CONFLICT(user_id) DO NOTHING;
 UPDATE public.wallet_accounts wa SET available_balance=wa.available_balance-p_amount,updated_at=now()
 WHERE wa.user_id=p_user_id AND wa.available_balance>=p_amount RETURNING wa.available_balance INTO v_balance;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cüzdan bakiyen yetersiz. En az 25 TL gerekli.'; END IF;
 INSERT INTO public.task_promotions(task_id,user_id,amount,ends_at,idempotency_key)
 VALUES(p_task_id,p_user_id,p_amount,now()+interval '24 hours',p_key) RETURNING * INTO v_promotion;
 UPDATE public.tasks SET featured_until=v_promotion.ends_at,updated_at=now() WHERE id=p_task_id;
 INSERT INTO public.wallet_transactions(user_id,task_id,type,amount,status,description,idempotency_key,metadata)
 VALUES(p_user_id,p_task_id,'task_promotion',p_amount,'completed','İlan 24 saatliğine öne çıkarıldı',p_key,jsonb_build_object('promotionId',v_promotion.id,'endsAt',v_promotion.ends_at));
 RETURN QUERY SELECT v_promotion.ends_at,v_balance,false;
END
$function$;