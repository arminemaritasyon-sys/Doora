ALTER TABLE public.wallet_withdrawals
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS account_holder_name text;

CREATE OR REPLACE FUNCTION public.doora_test_withdraw(
  p_user_id text,
  p_amount numeric,
  p_iban text,
  p_account_holder_name text
)
RETURNS TABLE(withdrawal_id uuid, available_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_amount <= 0 OR p_amount > 50000 THEN
    RAISE EXCEPTION 'Çekim tutarı 1-50000 TL arasında olmalı';
  END IF;
  IF p_iban IS NULL OR p_iban !~* '^TR[0-9]{24}$' THEN
    RAISE EXCEPTION 'Geçerli bir TR IBAN girilmeli';
  END IF;
  IF COALESCE(trim(p_account_holder_name), '') = '' THEN
    RAISE EXCEPTION 'Hesap sahibi adı gerekli';
  END IF;

  INSERT INTO public.wallet_accounts(user_id, mode)
  VALUES (p_user_id, 'test')
  ON CONFLICT(user_id) DO NOTHING;

  UPDATE public.wallet_accounts AS wa
  SET available_balance = wa.available_balance - p_amount, updated_at = now()
  WHERE wa.user_id = p_user_id AND wa.available_balance >= p_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kullanılabilir bakiye yetersiz';
  END IF;

  INSERT INTO public.wallet_withdrawals(user_id, amount, mode, iban, account_holder_name)
  VALUES (p_user_id, p_amount, 'test', upper(p_iban), trim(p_account_holder_name))
  RETURNING id INTO v_id;

  INSERT INTO public.wallet_transactions(user_id, type, amount, status, description, metadata)
  VALUES (p_user_id, 'withdrawal_request', p_amount, 'pending', 'Test çekim talebi', jsonb_build_object('withdrawalId', v_id));

  RETURN QUERY
  SELECT v_id, wa.available_balance
  FROM public.wallet_accounts AS wa
  WHERE wa.user_id = p_user_id;
END
$function$;
