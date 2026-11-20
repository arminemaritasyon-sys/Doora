-- Resolve PL/pgSQL output-parameter/column-name collisions in wallet functions.
-- Qualify wallet_accounts references whenever available_balance is also a RETURNS TABLE output.
CREATE OR REPLACE FUNCTION public.doora_accept_offer(p_owner_id text, p_offer_id uuid)
RETURNS TABLE(task_id uuid, locked_amount numeric, available_balance numeric, held_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_task public.tasks%ROWTYPE; v_offer public.offers%ROWTYPE;
BEGIN
 SELECT t.* INTO v_task FROM public.tasks t JOIN public.offers o ON o.task_id=t.id WHERE o.id=p_offer_id FOR UPDATE OF t;
 IF NOT FOUND OR v_task.owner_id<>p_owner_id OR v_task.status<>'open' THEN RAISE EXCEPTION 'İlan kabul işlemine uygun değil'; END IF;
 SELECT * INTO v_offer FROM public.offers WHERE id=p_offer_id AND task_id=v_task.id FOR UPDATE;
 INSERT INTO public.wallet_accounts(user_id,mode) VALUES(p_owner_id,'test') ON CONFLICT(user_id) DO NOTHING;
 IF (SELECT wa.available_balance FROM public.wallet_accounts wa WHERE wa.user_id=p_owner_id FOR UPDATE) < v_offer.amount THEN RAISE EXCEPTION 'Cüzdan bakiyesi teklif tutarı için yetersiz'; END IF;
 UPDATE public.wallet_accounts AS wa SET available_balance=wa.available_balance-v_offer.amount,held_balance=wa.held_balance+v_offer.amount,updated_at=now() WHERE wa.user_id=p_owner_id;
 UPDATE public.tasks SET status='assigned',assigned_offer_id=p_offer_id,updated_at=now() WHERE id=v_task.id;
 UPDATE public.offers SET status=CASE WHEN id=p_offer_id THEN 'accepted' ELSE 'rejected' END,updated_at=now() WHERE task_id=v_task.id;
 INSERT INTO public.wallet_transactions(user_id,task_id,related_user_id,type,amount,status,description)
 VALUES(p_owner_id,v_task.id,v_offer.user_id,'escrow_lock',v_offer.amount,'completed','İş tamamlanana kadar emanet hesaba alındı');
 RETURN QUERY SELECT v_task.id,v_offer.amount,wa.available_balance,wa.held_balance FROM public.wallet_accounts wa WHERE wa.user_id=p_owner_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.doora_test_topup(p_user_id text, p_amount numeric, p_key text)
RETURNS TABLE(available_balance numeric, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_tx uuid;
BEGIN
 IF p_amount <= 0 OR p_amount > 50000 THEN RAISE EXCEPTION 'Test yükleme tutarı 1-50000 TL arasında olmalı'; END IF;
 INSERT INTO public.wallet_accounts(user_id,mode) VALUES(p_user_id,'test') ON CONFLICT(user_id) DO NOTHING;
 INSERT INTO public.wallet_transactions(user_id,type,amount,status,description,idempotency_key)
 VALUES(p_user_id,'test_topup',p_amount,'completed','Test bakiyesi yükleme',p_key)
 ON CONFLICT(idempotency_key) DO NOTHING RETURNING id INTO v_tx;
 IF v_tx IS NOT NULL THEN
   UPDATE public.wallet_accounts AS wa SET available_balance=wa.available_balance+p_amount,updated_at=now() WHERE wa.user_id=p_user_id;
 ELSE
   SELECT wt.id INTO v_tx FROM public.wallet_transactions wt WHERE wt.idempotency_key=p_key;
 END IF;
 RETURN QUERY SELECT wa.available_balance,v_tx FROM public.wallet_accounts wa WHERE wa.user_id=p_user_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.doora_test_withdraw(p_user_id text, p_amount numeric)
RETURNS TABLE(withdrawal_id uuid, available_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
 IF p_amount<=0 OR p_amount>50000 THEN RAISE EXCEPTION 'Çekim tutarı 1-50000 TL arasında olmalı'; END IF;
 INSERT INTO public.wallet_accounts(user_id,mode) VALUES(p_user_id,'test') ON CONFLICT(user_id) DO NOTHING;
 UPDATE public.wallet_accounts AS wa SET available_balance=wa.available_balance-p_amount,updated_at=now()
 WHERE wa.user_id=p_user_id AND wa.available_balance>=p_amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'Kullanılabilir bakiye yetersiz'; END IF;
 INSERT INTO public.wallet_withdrawals(user_id,amount,mode) VALUES(p_user_id,p_amount,'test') RETURNING id INTO v_id;
 INSERT INTO public.wallet_transactions(user_id,type,amount,status,description,metadata)
 VALUES(p_user_id,'withdrawal_request',p_amount,'pending','Test çekim talebi',jsonb_build_object('withdrawalId',v_id));
 RETURN QUERY SELECT v_id,wa.available_balance FROM public.wallet_accounts wa WHERE wa.user_id=p_user_id;
END
$function$;
