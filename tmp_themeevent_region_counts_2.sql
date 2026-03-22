select coalesce(region, '<NULL>') as region, "sourceType", count(*) as total
from "ThemeEvent"
group by 1,2
order by 1,2;
