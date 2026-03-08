**Setup MaxMind GeoLite2 City for Geo-Locations**

## **1. Download & bundle the GeoLite2 City DB**

1.  Go to
    [[https://dev.maxmind.com/geoip/geoip2/geolite2/]{.underline}](https://dev.maxmind.com/geoip/geoip2/geolite2/)
    and register for a (free) account.

2.  Download the **GeoLite2-City.mmdb** file.

3.  Add it to your service (e.g. ./data/GeoLite2-City.mmdb) and include
    it in your CI/CD artifacts.

## **2. Query by IP in your Node.js/TypeScript backend**

Install the MaxMind reader:

npm install \@maxmind/geoip2-node

Then, in your service code:

import { Reader, CityResponse } from \'@maxmind/geoip2-node\';

let geoReader: Reader\<CityResponse\>;

// On app startup:

async function initGeo() {

geoReader = await Reader.open(\'./data/GeoLite2-City.mmdb\');

}

initGeo();

// Whenever you need the timezone:

function tzFromIp(ip: string): string \| null {

try {

const city = geoReader.city(ip);

// city.location.time_zone is an IANA TZ string

return city.location.time_zone;

} catch {

return null; // e.g. private‐range or malformed IP

}

}

// Example:

const userIp = \'8.8.8.8\';

console.log(tzFromIp(userIp)); // \"America/Los_Angeles\"

**What you get back** (CityResponse.location):

{

\"latitude\": 34.05,

\"longitude\": -118.24,

\"time_zone\": \"America/Los_Angeles\",

\"accuracy_radius\": 1000,

// ...other fields

}



## **3. Wire it into your geolocation flow**

1.  **Client side**: use navigator.geolocation.getCurrentPosition or
    capture the IP server-side (e.g. from X-Forwarded-For).

2.  **Backend**: call tzFromIp(ip).

3.  **Persist/display** the returned IANA ID (Europe/Paris,
    Asia/Kolkata, etc.) wherever you need it.
