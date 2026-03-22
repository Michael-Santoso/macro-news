select "sourceType", count(*) as total
from "ThemeEvent"
group by 1
order by 1;
