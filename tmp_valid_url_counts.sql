select "sourceType",
       count(*) as total,
       count(*) filter (where "sourceUrl" is not null and btrim("sourceUrl") <> '' and "sourceUrl" ~* '^https?://[^[:space:]]+$') as valid_like_http,
       count(*) filter (where "sourceUrl" is null or btrim("sourceUrl") = '') as empty_url,
       count(*) filter (where not ("sourceUrl" is null or btrim("sourceUrl") = '') and not ("sourceUrl" ~* '^https?://[^[:space:]]+$')) as non_http_or_malformed
from "ThemeEvent"
group by 1
order by 1;
