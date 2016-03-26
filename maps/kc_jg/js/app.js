var southWest = L.latLng(-85, -180),
    northEast = L.latLng(85, 180),
    worldBounds = L.latLngBounds(southWest, northEast);

var map = L.map("map", {
  noWrap: true,
  minZoom: 3,
  maxZoom: 8,
  maxBounds: worldBounds
}).setView([37.75, -122.23], 3);

L.esri.basemapLayer("Streets", {
  noWrap: true
}).addTo(map);

L.esri.featureLayer({
  url: 'http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0',
  where: "COUNTRY IN('France', 'Switzerland', 'Morocco', 'United States', 'Australia', 'Spain', 'Japan')",
  style: {
    fillOpacity: 0,
    weight: 1.5
  }
}).addTo(map);
