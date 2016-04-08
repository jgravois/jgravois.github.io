var southWest = L.latLng(-85, -180),
    northEast = L.latLng(85, 180),
    worldBounds = L.latLngBounds(southWest, northEast);

var map = L.map("map", {
  noWrap: true,
  minZoom: 3,
  maxZoom: 8,
  maxBounds: worldBounds
}).setView([37.75, -122.23], 3);

L.esri.basemapLayer("Gray", {
  noWrap: true
}).addTo(map);

var done = "'France', 'Switzerland', 'Morocco', 'Australia', 'Spain', 'Japan', ";

var soon = "'Australia', 'New Zealand', 'Belize', 'Costa Rica', 'India', 'Chile'";

L.esri.featureLayer({
  url: 'http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0',
  where: "Country IN(" + done + soon + ")",
  style: function (feature) {
    if (soon.search(feature.properties.Country) > 0) {
      return {
        color: '#F2D653',
        weight: 1.5
      }
    }
    else {
      return {
        color: '#37424A',
        weight: 1.5
      }
    }
  }
}).addTo(map);

L.esri.featureLayer({
  url: 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/3',
  where: "STATE_NAME IN('California', 'New Jersey', 'Hawaii', 'Utah', 'Washington', 'Oregon', 'Nevada', 'Louisiana', 'Florida', 'Georgia', 'Colorado')",
  style: {
    color: '#37424A',
    weight: 1.5
  }
}).addTo(map);
