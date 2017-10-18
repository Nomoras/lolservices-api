# League Service Backend

The Node server backend API for League of Legends related functions.
[Click for an example application using this service.](http://samuelzhou.me/d1/)

Projects:
---
- Solo Queue Tracker App **(in progress)**
- Match database for future web-based statistics tracking **(planned)**

Features:
---
- Add and delete summoners
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
|**URI**|**Methods**|**Description**|
|---|---|---|
|`/api/summoner/:name`|POST, DELETE, GET|Registers/gets/deletes a raw summoner object along with its matches from the database. Unless your name is "all"|
|`/api/summoner/all`|GET|Gets a list of all summoners currently registered|
|`/api/summoner/stats/:name`|GET|Gets the summoner's current and peak stats.<br>Query strings:<br>**queue**: 1 for solo queue, any other value for flex<br>**reverse**: whether or not to start the query from the most recent game<br>**limit**: maximum number of games to retrieve (after all filters are performed)<br>**champions**: comma separated list of champion ids to filter<br>**role**: comma separated list of roles to filter (top, mid, jungle, adc, support)<br>**ranklimit**: Limit games up to a certain rank being achieved<br>**result**: `win` to only return victories, `lose` to only return losses<br>**peak**: whether or not to return the stats from the peak rating or the current rating<br>**timestamp**: limit games up to a certain time in epoch milliseconds
|`/api/summoner/update`|POST|Updates matches and profile information for a summoner|
|`/api/loldata/roles`|GET|Gets a list of all roles currently being used|
|`/api/loldata/rankscore`|GET|Gets a numerical equivalent to a League rating. Mandatory parameters:<br>**tier, division, lp** - Ranked information to convert to a score|
|`/api/loldata/ddcfg`|GET|Direct call to the LoL Static Data API to get the current Data Dragon parameters|
|`/api/loldata/champions`|GET|Gets a map from champion id to champion name, and the reverse map from name to id|
|`/api/loldata/lastupdated`|GET|Gets the most recent update for the database, in epoch milliseconds|
|`/api/loldata/clearcache`|POST|Clears the current query cache. Useful when new champions come out.|
