-- Poistoilmalämpöpumppu pois MVP:stä toistaiseksi

update public.job_types
set is_active = false
where slug = 'poistoilmalampopumppu';

update public.job_types
set sort_order = 3
where slug = 'maalampopumppu';
