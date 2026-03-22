select te.title, ra.source, te."sourceType", te."sourceUrl", te."publishedAt", te.theme, coalesce(te.region, '<NULL>') as region
from "ThemeEvent" te
left join "RawArticle" ra on ra.id = te."sourceId"
where te."sourceType"='RAW_ARTICLE'
order by te."publishedAt" desc
limit 20;
