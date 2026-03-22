with scenarios as (
  select '"'"'inflation'"'"'::text as theme, '"'"'GLOBAL'"'"'::text as region union all
  select '"'"'inflation'"'"', '"'"'US'"'"' union all
  select '"'"'energy_oil'"'"', '"'"'GLOBAL'"'"' union all
  select '"'"'financial_regulation'"'"', '"'"'US'"'"'
)
select s.theme,
       s.region,
       count(*) as total_old_exact_region,
       count(*) filter (where te."sourceType"='"'"'RAW_ARTICLE'"'"') as news_old_exact_region,
       count(*) filter (where te."sourceType" in ('"'"'OFFICIAL_ANNOUNCEMENT'"'"','"'"'REGULATORY_ANNOUNCEMENT'"'"')) as official_old_exact_region,
       count(*) filter (where te."sourceType"='"'"'MACRO_OBSERVATION'"'"') as other_old_exact_region
from scenarios s
join "ThemeEvent" te on te.theme::text = s.theme and te.region = s.region
group by 1,2
order by 1,2;
