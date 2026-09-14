-- Suosittelu: vain vahvistetun sähköpostin omaavat tilit kelpaavat suosittelijaksi.

CREATE OR REPLACE FUNCTION public.get_customer_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.id
  FROM public.profiles pr
  INNER JOIN auth.users au ON au.id = pr.id
  WHERE pr.role = 'customer'
    AND lower(trim(au.email)) = lower(trim(p_email))
    AND au.email_confirmed_at IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_contractor_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.id
  FROM public.contractor_profiles cp
  INNER JOIN auth.users au ON au.id = cp.id
  INNER JOIN public.profiles pr ON pr.id = cp.id
  WHERE pr.role = 'contractor'
    AND lower(trim(au.email)) = lower(trim(p_email))
    AND au.email_confirmed_at IS NOT NULL
  LIMIT 1;
$$;
