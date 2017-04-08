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
|`/api/summoner/stats/:name`|GET|Gets the summoner's current and peak stats.<br>Query strings:<br>**queue**: 1 for solo queue, any other value for flex<br>**reverse**: whether or not to start the query from the most recent game<br>**limit**: maximum number of games to retrieve (after all filters are performed)<br>**champions**: comma separated list of champion ids to filter<br>**role**: comma separated list of roles to filter (top, mid, jungle, adc, support)
|`/api/summoner/update`|POST|Updates matches and profile information for a summoner|
