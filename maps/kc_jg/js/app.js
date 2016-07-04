var southWest = L.latLng(-85, -180),
    northEast = L.latLng(85, 180),
    worldBounds = L.latLngBounds(southWest, northEast);

var map = L.map("map", {
  noWrap: true,
  minZoom: 1,
  maxZoom: 8,
  maxBounds: worldBounds,
  scrollWheelZoom: false
}).setView([37.75, -122.23], 1);

map.on("click", accidentalScroll);

function accidentalScroll() {
  map.scrollWheelZoom.enable();
  map.off("click", accidentalScroll);
}

L.esri.basemapLayer("Gray", {
  noWrap: true
}).addTo(map);

var done = "'France', 'Switzerland', 'Morocco', 'Australia', 'Spain', 'Japan', ";

var soon = "'Australia', 'New Zealand', 'Belize', 'Costa Rica', 'India', 'Chile', 'Bhutan', 'Myanmar'";

L.esri.featureLayer({
  url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0',
  where: "Country IN(" + done + soon + ")",
  style: function (feature) {
    if (soon.search(feature.properties.Country) > 0) {
      return {
        color: '#60FE44',
        weight: 1.5
      }
    }
    else {
      return {
        color: '#E79F36',
        weight: 1.5
      }
    }
  }
}).addTo(map);

L.esri.featureLayer({
  url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer/3',
  where: "STATE_NAME IN('California', 'New Jersey', 'Hawaii', 'Utah', 'Washington', 'Oregon', 'Nevada', 'Louisiana', 'Florida', 'Georgia', 'Arizona', 'North Carolina')",
  style: {
    color: '#37424A',
    weight: 1.5
  }
}).addTo(map);
