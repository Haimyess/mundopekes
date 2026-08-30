-- age_ranges había quedado con dos siembras del mismo rango de edades bajo
-- dos convenciones de label_key distintas: ids 1-5 ('age_range_0_12', etc,
-- legado, sin traducción en ningún locale — ver el workaround documentado en
-- apps/web/app/components/activity/Meta.vue) e ids 6-11 ('age.babies', etc,
-- la única convención que sí tiene entradas en entityForm.ageLabels.* de
-- apps/admin/i18n/locales/*.json). Resultado visible: el selector de edades
-- del admin mostraba cada rango duplicado, uno traducido y otro con la key
-- cruda ("age_range_0_12"). Ambos sets tenían actividades reales asociadas,
-- así que no alcanza con borrar — hay que remapear primero.
--
-- Mapeo legado -> canónico (mismo rango de meses, salvo #5/#10 donde el
-- legado no llegaba a "216 meses = todas las edades" como sí hace #10):
--   1 (age_range_0_12)   -> 6  (age.babies)
--   2 (age_range_1_3)    -> 7  (age.toddlers)
--   3 (age_range_3_6)    -> 8  (age.preschool)
--   4 (age_range_6_12)   -> 9  (age.school)
--   5 (age_range_12_plus)-> 10 (age.teens)
-- 11 (age.all) no tiene duplicado, queda igual.

begin;

insert into activity_age_ranges (activity_id, age_range_id)
select activity_id, case age_range_id
  when 1 then 6
  when 2 then 7
  when 3 then 8
  when 4 then 9
  when 5 then 10
end
from activity_age_ranges
where age_range_id in (1, 2, 3, 4, 5)
on conflict (activity_id, age_range_id) do nothing;

delete from activity_age_ranges where age_range_id in (1, 2, 3, 4, 5);

delete from age_ranges where id in (1, 2, 3, 4, 5);

commit;
