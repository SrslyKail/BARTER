let google = require("@googlemaps/js-api-loader");
let location = require("./location");
const userPosition = location.userPosition;
let map, infoWindow;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 6,
    });
    
    infoWindow = new google.maps.InfoWindow();

    const locationButton = document.createElement("button");

    locationButton.textContent = "Pan to Current Location";
    locationButton.classList.add("custom-map-control-button");

    map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);

    navigator.geolocation.watchPosition(() => {
        updateUserPosOnMap();
    }, handleLocationError(false, infoWindow, map.getCenter()));
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? "Error: The Geolocation service failed."
            : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

function updateUserPosOnMap() {
    infoWindow.setPosition(userPosition);
    infoWindow.setContent("Location found.");
    infoWindow.open(map);
    map.setCenter(pos);
}

window.initMap = initMap;
