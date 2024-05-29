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

/**
 * Gets the placename of the coordinates you pass in, if Google has one.
 * @param {Number} long
 * @param {Number} lat
 * @returns {String}
 */
async function getPlaceName(long, lat) {
  let req = { latitude: lat, longitude: long, key: GMAPS_API_KEY };
  let res = await client
    .reverseGeocode({
      params: {
        latlng: { latitude: lat, longitude: long },
        result_type: ["locality"],
        key: GMAPS_API_KEY,
      },
    })
    .catch((err) => {
      console.warn("caught error on getPlaceName:", err);
    });
  // console.log("getPlacename Results:", res.data.results);
  return res.data.results[0].formatted_address;
}

module.exports = { getPlaceName };
