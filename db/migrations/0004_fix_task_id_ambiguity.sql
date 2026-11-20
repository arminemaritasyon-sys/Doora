-- Qualify task_id references in doora_accept_offer to avoid collision with RETURNS TABLE(task_id ...).
CREATE OR REPLACE FUNCTION public.doora_accept_offer(p_owner_id text, p_offer_id uuid)
RETURNS TABLE(task_id uuid, locked_amount numeric, available_balance numeric, held_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_task public.tasks%ROWTYPE; v_offer public.offers%ROWTYPE;
BEGIN
 SELECT t.* INTO v_task FROM public.tasks AS t
 JOIN public.offers AS offer_lookup ON offer_lookup.task_id=t.id
 WHERE offer_lookup.id=p_offer_id FOR UPDATE OF t;
 IF NOT FOUND OR v_task.owner_id<>p_owner_id OR v_task.status<>'open' THEN RAISE EXCEPTION 'İlan kabul işlemine uygun değil'; END IF;
 SELECT offer_row.* INTO v_offer FROM public.offers AS offer_row
 WHERE offer_row.id=p_offer_id AND offer_row.task_id=v_task.id FOR UPDATE;
 INSERT INTO public.wallet_accounts(user_id,mode) VALUES(p_owner_id,'test') ON CONFLICT(user_id) DO NOTHING;
 IF (SELECT wa.available_balance FROM public.wallet_accounts AS wa WHERE wa.user_id=p_owner_id FOR UPDATE) < v_offer.amount THEN RAISE EXCEPTION 'Cüzdan bakiyesi teklif tutarı için yetersiz'; END IF;
 UPDATE public.wallet_accounts AS wa SET available_balance=wa.available_balance-v_offer.amount,held_balance=wa.held_balance+v_offer.amount,updated_at=now() WHERE wa.user_id=p_owner_id;
 UPDATE public.tasks AS task_row SET status='assigned',assigned_offer_id=p_offer_id,updated_at=now() WHERE task_row.id=v_task.id;
 UPDATE public.offers AS offer_row SET status=CASE WHEN offer_row.id=p_offer_id THEN 'accepted' ELSE 'rejected' END,updated_at=now() WHERE offer_row.task_id=v_task.id;
 INSERT INTO public.wallet_transactions(user_id,task_id,related_user_id,type,amount,status,description)
 VALUES(p_owner_id,v_task.id,v_offer.user_id,'escrow_lock',v_offer.amount,'completed','İş tamamlanana kadar emanet hesaba alındı');
 RETURN QUERY SELECT v_task.id,v_offer.amount,wa.available_balance,wa.held_balance FROM public.wallet_accounts AS wa WHERE wa.user_id=p_owner_id;
END
$function$;
