-- Harden the database functions even if a caller bypasses the API route checks.
-- Remove the obsolete withdrawal overload that does not require IBAN/account-holder details.
DROP FUNCTION IF EXISTS public.doora_test_withdraw(text, numeric);

CREATE OR REPLACE FUNCTION public.doora_accept_offer(p_owner_id text, p_offer_id uuid)
RETURNS TABLE(task_id uuid, locked_amount numeric, available_balance numeric, held_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_offer public.offers%ROWTYPE;
BEGIN
  SELECT t.*
  INTO v_task
  FROM public.tasks AS t
  JOIN public.offers AS offer_lookup ON offer_lookup.task_id = t.id
  WHERE offer_lookup.id = p_offer_id
  FOR UPDATE OF t;

  IF NOT FOUND OR v_task.owner_id <> p_owner_id OR v_task.status <> 'open' THEN
    RAISE EXCEPTION 'İlan kabul işlemine uygun değil';
  END IF;

  SELECT offer_row.*
  INTO v_offer
  FROM public.offers AS offer_row
  WHERE offer_row.id = p_offer_id
    AND offer_row.task_id = v_task.id
    AND offer_row.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND OR v_offer.user_id = p_owner_id THEN
    RAISE EXCEPTION 'Teklif kabul işlemine uygun değil';
  END IF;

  INSERT INTO public.wallet_accounts(user_id, mode)
  VALUES (p_owner_id, 'test')
  ON CONFLICT(user_id) DO NOTHING;

  IF (
    SELECT wa.available_balance
    FROM public.wallet_accounts AS wa
    WHERE wa.user_id = p_owner_id
    FOR UPDATE
  ) < v_offer.amount THEN
    RAISE EXCEPTION 'Cüzdan bakiyesi teklif tutarı için yetersiz';
  END IF;

  UPDATE public.wallet_accounts AS wa
  SET available_balance = wa.available_balance - v_offer.amount,
      held_balance = wa.held_balance + v_offer.amount,
      updated_at = now()
  WHERE wa.user_id = p_owner_id;

  UPDATE public.tasks AS task_row
  SET status = 'assigned',
      assigned_offer_id = p_offer_id,
      updated_at = now()
  WHERE task_row.id = v_task.id;

  UPDATE public.offers AS offer_row
  SET status = CASE WHEN offer_row.id = p_offer_id THEN 'accepted' ELSE 'rejected' END,
      updated_at = now()
  WHERE offer_row.task_id = v_task.id;

  INSERT INTO public.wallet_transactions(user_id, task_id, related_user_id, type, amount, status, description)
  VALUES (
    p_owner_id, v_task.id, v_offer.user_id, 'escrow_lock', v_offer.amount,
    'completed', 'İş tamamlanana kadar emanet hesaba alındı'
  );

  RETURN QUERY
  SELECT v_task.id, v_offer.amount, wa.available_balance, wa.held_balance
  FROM public.wallet_accounts AS wa
  WHERE wa.user_id = p_owner_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.doora_complete_task(p_owner_id text, p_task_id uuid)
RETURNS TABLE(released_amount numeric, provider_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_offer public.offers%ROWTYPE;
BEGIN
  SELECT *
  INTO v_task
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_task.owner_id <> p_owner_id
    OR v_task.status <> 'assigned'
    OR v_task.assigned_offer_id IS NULL
    OR v_task.completion_requested_at IS NULL THEN
    RAISE EXCEPTION 'İş tamamlanma onayına uygun değil';
  END IF;

  SELECT *
  INTO v_offer
  FROM public.offers
  WHERE id = v_task.assigned_offer_id
    AND task_id = p_task_id
    AND status = 'accepted'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kabul edilmiş teklif bulunamadı';
  END IF;

  UPDATE public.wallet_accounts
  SET held_balance = held_balance - v_offer.amount,
      updated_at = now()
  WHERE user_id = p_owner_id
    AND held_balance >= v_offer.amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emanet bakiyesi bulunamadı';
  END IF;

  INSERT INTO public.wallet_accounts(user_id, mode)
  VALUES (v_offer.user_id, 'test')
  ON CONFLICT(user_id) DO NOTHING;

  UPDATE public.wallet_accounts
  SET available_balance = available_balance + v_offer.amount,
      updated_at = now()
  WHERE user_id = v_offer.user_id;

  UPDATE public.tasks
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_task_id;

  INSERT INTO public.wallet_transactions(user_id, task_id, related_user_id, type, amount, status, description)
  VALUES
    (p_owner_id, p_task_id, v_offer.user_id, 'escrow_release', v_offer.amount, 'completed', 'Emanet tutar iş tamamlanınca serbest bırakıldı'),
    (v_offer.user_id, p_task_id, p_owner_id, 'escrow_release', v_offer.amount, 'completed', 'Tamamlanan işin ödemesi cüzdana aktarıldı');

  RETURN QUERY
  SELECT v_offer.amount, wa.available_balance
  FROM public.wallet_accounts AS wa
  WHERE wa.user_id = v_offer.user_id;
END
$function$;
