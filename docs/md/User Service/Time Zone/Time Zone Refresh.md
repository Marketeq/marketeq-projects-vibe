**Time Zone Refresh**\
\
Here's a pattern you can plug straight into your login flow so that
every time someone signs in (or refreshes in "travel mode"), you detect
and persist their current IANA time-zone:

## **1. Front-end: grab the best time zone you can**

****async function detectTimeZone() {

// 1A. Browser geolocation + Google Time Zone API (most accurate)

// -- prompt the user once, then reuse

if (navigator.geolocation) {

try {

const { coords } = await new Promise((res, rej) =\>

navigator.geolocation.getCurrentPosition(res, rej)

);

const resp = await fetch(

\`/api/timezone/from-coords?lat=\${coords.latitude}&lng=\${coords.longitude}\`

);

return (await resp.json()).timeZoneId;

} catch (e) {

/\* fallback to IP lookup \*/

}

}

// 1B. IP-based lookup (no prompt)

const resp = await fetch(\`/api/timezone/from-ip\`);

return (await resp.json()).timeZoneId;

}

> **Note**:

- Geolocation API gives you the most precise location (and DST
  handling).

- If the user blocks location, you still get a decent guess from IP.

## **2. Back-end endpoints in your User Service**

Assuming Node.js + Express + MaxMind GeoLite2:

import express from \'express\';

import { Reader as GeoReader, CityResponse } from
\'@maxmind/geoip2-node\';

const app = express();

let geoReader: GeoReader\<CityResponse\>;

(async () =\> {

geoReader = await GeoReader.open(\'./data/GeoLite2-City.mmdb\');

})();

// 2A. IP → Time Zone

app.get(\'/api/timezone/from-ip\', (req, res) =\> {

const ip = req.ip \|\|
req.headers\[\'x-forwarded-for\'\]?.toString().split(\',\')\[0\];

try {

const city = geoReader.city(ip!);

return res.json({ timeZoneId: city.location.time_zone });

} catch {

return res.status(502).json({ error: \'lookup_failed\' });

}

});

// 2B. Lat/Lng → Time Zone (if you opt for Google's API)

app.get(\'/api/timezone/from-coords\', async (req, res) =\> {

const { lat, lng } = req.query;

// call Google Maps Time Zone API (or WorldTimeAPI) here...

// then return { timeZoneId: \'Europe/Paris\' }

});



## **3. Persisting on login**

Extend your existing login handler so it takes an optional timeZoneId
field:

app.post(\'/api/auth/login\', async (req, res) =\> {

const { email, password, timeZoneId } = req.body;

const user = await authenticate(email, password);

if (!user) return res.status(401).send();

// Only update if changed, to avoid churn

if (timeZoneId && timeZoneId !== user.timeZone) {

await db.users.update({ id: user.id, timeZone: timeZoneId });

}

const token = createJwt({ sub: user.id, tz: timeZoneId \|\|
user.timeZone });

res.json({ token, user: { \...user, timeZone: timeZoneId \|\|
user.timeZone } });

});

> **Tip:** check timeZoneId !== user.timeZone so you only ping your DB
> when they actually switch zones.

## **4. "Travel mode" real-time refresh**

If you want them to stay always in sync while the app is open:

1.  On every page-load or every N minutes, call detectTimeZone().

2.  If it comes back different, fire an 🔄 background PATCH to
    /api/users/me/timezone.

3.  Update your Redux/React state with the new time zone so any clocks
    or scheduler components immediately shift.

// e.g. React effect

useEffect(() =\> {

let interval = setInterval(async () =\> {

const tz = await detectTimeZone();

if (tz !== currentUser.timeZone) {

await fetch(\'/api/users/me/timezone\', {

method: \'PATCH\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify({ timeZoneId: tz }),

});

dispatch(updateUser({ timeZone: tz }));

}

}, 5 \* 60 \* 1000); // every 5m

return () =\> clearInterval(interval);

}, \[\]);



## **5. Database design**

Just add a timeZone VARCHAR(64) (or TEXT) column on your users table. No
need for a full history --- you only care about the latest zone.

ALTER TABLE users ADD COLUMN timeZone VARCHAR(64);



### **Why this covers all bases:**

- **Global**: GeoLite2 + browser API works everywhere.

- **Free**: GeoLite2 (free forever) + native JS APIs.

- **Real-time**: You re-detect on login and on interval/tokencall.

- **Seamless UX**: No manual dropdowns, no stale data when they travel.
