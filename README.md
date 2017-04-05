# League Service Backend

The Node server backend API for League of Legends related functions.

Projects:
---
- Solo Queue Tracker App **(in progress)**
- Match database for future web-based statistics tracking **(planned)**

Planned Features:
---
- Add and delete summoners **(complete)**
- Get ranked information for summoners **(complete)**
- Parse matches for individual statistics
- Store match list for each summoner **(complete)**
- Aggregate match statistics based on match filters
- Support periodic updating

Usage:
---

The MongoDB path and Riot Games API key must be filled in `default.json`.
By default, the database path is `mongodb://localhost:27017/league`.
Run the application with `npm start`.

Current Endpoints:
---
|**URI**|**Methods**|**Notes**|
|---|---|---|
|`/api/summoner/:name`|POST, DELETE, GET|Registers/gets/deletes a raw summoner object along with its matches from the database|
|`/api/summoner/stats/:name`|GET|Gets the summoner's current and peak stats. Currently supports query strings: `queue=1&limit=10&reverse=true` will get the stats for the last 10 solo queue games for the summoner retrieved.|
|`/api/summoner/update`|POST|Updates matches for a summoner|
