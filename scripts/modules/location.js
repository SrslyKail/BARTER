/**
 * Module for tracking user location, and querying about locations to Google Maps
 */

require("dotenv").config();
const {
    Client,
    PlaceInputType,
    Language,
} = require("@googlemaps/google-maps-services-js");
const client = new Client();
const GMAPS_API_KEY = process.env.GMAPS_API_KEY;
console.log(GMAPS_API_KEY);

async function testFetch() {
    // let res = await client.elevation({
    //     params: {
    //         locations: [{ lat: 45, lng: -110 }],
    //         key: GMAPS_API_KEY,
    //     },
    //     timeout: 1000, // milliseconds
    // });
    let query = "BCIT Burnaby";
    // console.log(query);
    let res = await client.textSearch({
        params: {
            language: Language.en,
            key: GMAPS_API_KEY,
            input: query,
            inputtype: PlaceInputType.textQuery,
        },
    });
    // query = query.replaceAll(" ", "+");
    console.log(res.data);
}
/**@type {GeolocationPosition} */
let userPosition = null;

/** @type {PositionOptions} */
const positionOptions = {
    enableHighAccuracy: true,
};

/**
 * Starts tracking the user location, and sets a watcher for position updates.
 */
function setupLocation() {
    //CB: Useful information on how Geolocation works:
    //https://w3c.github.io/geolocation-api/#dom-geolocationposition

    //uses navigator to get the geolocation
    //Watch position does it constantly instead of just once
    navigator.geolocation.watchPosition(
        (position) => {
            userPosition = position;
        },
        null,
        positionOptions
    );
}

setupLocation();

module.exports = { userPosition };
