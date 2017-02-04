# League Service Backend

The Node server backend API for League of Legends related functions.

Projects:
---
- Solo Queue Tracker App **(in progress)**
- Match database for future web-based statistics tracking **(planned)**

Planned Features:
---
- Add and delete summoners **(complete)**
- Get ranked information for summoners
- Parse matches for individual statistics
- Store match list for each summoner
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
|`/api/summoner/:name`|POST, DELETE|Currently only mirrors League API data. |
