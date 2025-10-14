import { getGenerators, getGenInfo } from "./dataHelper.js";

const radiusCenter = [-4.07, 55.73];
const filterGroup = document.getElementById("filter-group");
let generators = await getGenerators();

const map = new maplibregl.Map({
  container: "map",
  zoom: 5,
  center: radiusCenter,
  style:
    "https://api.maptiler.com/maps/dataviz/style.json?key=y8C2n98M5Gq1bNIROgJt",
  maxZoom: 20,
  minZoom: 5,
  maxPitch: 85,
});

let scale = new maplibregl.ScaleControl({
  maxWidth: 80,
  unit: "metric", // 'imperial' or 'metric'
});
map.addControl(scale, "bottom-left");
map.addControl(new maplibregl.FullscreenControl());

map.on("load", async () => {
  drawSomeStuff(map);
});

// When a click event occurs on a feature in the places layer, open a popup at the
// location of the feature, with description HTML from its properties.
map.on("click", "Wind-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Natural Gas-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Nuclear-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Diesel/Gas Oil-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Biomass-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Coal-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Sour Gas-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Solar-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Hydro-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "Pumped hydro-fillLayer", (e) => {
  getGenInfo(e, map);
});
map.on("click", "BESS-fillLayer", (e) => {
  getGenInfo(e, map);
});

/**
 * Simple object to provide colours for layers and graphs
 */
const colorPalette = {
  Wind: "#44d444",
  Biomass: "#ffb399",
  Solar: "#ff33ff",
  Nuclear: "#c91aec",
  "Natural Gas": "#00b3e6",
  "Pumped hydro": "#2e8b57",
  Hydro: "#2e8b57",
  Coal: "#000000",
  "Diesel/Gas Oil": "#808080",
  "Sour Gas": "#b34d4d",
  BESS: "#00ffff",
};

/**
 *
 * @param {*} capacityLayer
 * @param {*} theMap
 *
 * Adds a capacity layer to the to map. This consists of a geoJSON data object containing circles whose
 * radius is proportional to the output capacity of the generator concerned. The circle is transparent, as this
 * allows the circle to be clicked, and generator info displayed.
 */
function addCapacityLayer(capacityLayer, theMap) {
  // Add the source to the map

  theMap.addSource(capacityLayer.name, {
    type: "geojson",
    data: capacityLayer.data,
    filter: ["==", ["get", "primaryFuel"], capacityLayer.name],
  });
  // Add a line layer
  theMap.addLayer({
    id: capacityLayer.lineName,
    type: "line",
    source: capacityLayer.name,
    paint: {
      "line-color": "#A9A9A9",
      "line-width": 1,
    },
  });
  // Add a fill layer with full transparency - this allows the click event to work
  theMap.addLayer({
    id: capacityLayer.fillName,
    type: "fill",
    source: capacityLayer.name,
    paint: {
      "fill-color": colorPalette[capacityLayer.name],
      "fill-opacity": 0,
    },
  });
}

/**
 *
 * @param {*} outputLayer
 * @param {*} theMap
 * *
 * Adds an output layer to the to map. This consists of a geoJSON data object containing circles whose
 * radius is proportional to the MW output of the generator concerned.
 *
 */
function addOutputLayer(outputLayer, theMap) {
  // Add the source to the map

  theMap.addSource(outputLayer.name, {
    type: "geojson",
    data: outputLayer.data,
    filter: [
      "==",
      ["get", "primaryFuel"],
      outputLayer.name.substring(0, outputLayer.name.length - 7),
    ], // Remove '-output' from the name to match the primaryFuel
  });

  // Add a fill layer with some transparency

  theMap.addLayer({
    id: outputLayer.fillName + "-output",
    type: "fill",
    source: outputLayer.name,
    paint: {
      "fill-color": colorPalette[outputLayer.fillName],
      "fill-opacity": 0.8,
    },
  });
}

/**
 *
 * @param {*} theMap
 *
 * A really crude function that uses the addOutputLayer / addCapacityLayer functions above to draw the map.
 *
 */
function drawSomeStuff(theMap) {
  let generatorLocations = `\{
        \"type\": \"FeatureCollection\",
        \"features\": \[`;

  let generatorLocationsJSON = {};

  let generatorOutputs = `\{
        \"type\": \"FeatureCollection\",
        \"features\": \[`;

  let generatorOutputsJSON = {};

  const circleOptions = {
    steps: 200,
    units: "meters",
  };

  generators.forEach((generator) => {
    // Creates a capacityCircle for each generator. It then adds the generated circle to the generatorsLocations string
    // (this is later converted to a GeoJSON object for use in the mapping of the circles onto the map).
    // Generate a polygon using turf.circle
    // See https://turfjs.org/docs/#circle

    let capacityRadius = parseFloat(generator.installedCapacity) * 20;
    let capacityCircle = turf.circle(
      [parseFloat(generator.lon), parseFloat(generator.lat)],
      capacityRadius,
      circleOptions
    );

    capacityCircle.properties.name = generator.siteName;
    capacityCircle.properties.installedCapacity = generator.installedCapacity;
    capacityCircle.properties.primaryFuel = generator.primaryFuel;
    capacityCircle.properties.totalOutput = generator.totalOutput;
    capacityCircle.properties.LngLatLike = [
      parseFloat(generator.lon),
      parseFloat(generator.lat),
    ];
    generatorLocations += JSON.stringify(capacityCircle) + ",";

    //This next bit creates the GeoJSON string for the generator outputs. It is similar to the above, but uses the totalOutput value instead of the installedCapacity value.
    let outputCircleRadius = 20 * generator.totalOutput;
    let outputCircle = {};
    outputCircle = turf.circle(
      [parseFloat(generator.lon), parseFloat(generator.lat)],
      outputCircleRadius,
      circleOptions
    );
    outputCircle.properties.name = generator.siteName;
    outputCircle.properties.primaryFuel = generator.primaryFuel;
    outputCircle.properties.totalOutput = generator.totalOutput;
    outputCircle.properties.LngLatLike = [
      parseFloat(generator.lon),
      parseFloat(generator.lat),
    ];
    generatorOutputs += JSON.stringify(outputCircle) + ",";
  }); //for

  //Complete the GeoJSON string for each circle/generation type.
  generatorLocations =
    generatorLocations.substring(0, generatorLocations.length - 1) + `\]}`;

  generatorLocationsJSON = JSON.parse(generatorLocations);

  //Complete the GeoJSON string for each generators output.
  generatorOutputs =
    generatorOutputs.substring(0, generatorOutputs.length - 1) + `\]}`;
  generatorOutputsJSON = JSON.parse(generatorOutputs);

  let layerArray = []; //An array to store the different generation layers.

  generatorLocationsJSON.features.forEach((feature) => {
    const layerID = feature.properties["primaryFuel"];

    // Add a layer for this symbol type if it hasn't been added already.
    if (!layerArray.includes(layerID)) {
      layerArray.push(layerID);
    }
  });
  layerArray.sort();

  /**
   * Add the generator locations layers to the map. There is a layer for each type of generator.
   * The data is in GeoJSON format, so we can add it as a source
   * and then add a fill layer and an outline layer to display it.
   **/

  layerArray.forEach((layer) => {
    let capacityLayerObject = {
      name: `${layer}`,
      data: generatorLocationsJSON,
      fillName: `${layer}-fillLayer`,
      lineName: `${layer}-lineLayer`,
    };

    addCapacityLayer(capacityLayerObject, theMap);

    let outputLayerObject = {
      name: `${layer}-output`,
      data: generatorOutputsJSON,
      fillName: `${layer}`,
    };

    addOutputLayer(outputLayerObject, theMap);

    // Add checkbox and label elements for the layer.
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = layer;
    input.checked = true;
    filterGroup.appendChild(input);

    const label = document.createElement("label");
    label.setAttribute("for", layer);
    label.style.backgroundColor = colorPalette[layer];
    label.textContent = layer;
    filterGroup.appendChild(label);

    // When the checkbox changes, update the visibility of the layer.
    input.addEventListener("change", (e) => {
      theMap.setLayoutProperty(
        `${e.target.id}-lineLayer`,
        "visibility",
        e.target.checked ? "visible" : "none"
      );
      theMap.setLayoutProperty(
        `${e.target.id}-fillLayer`,
        "visibility",
        e.target.checked ? "visible" : "none"
      );
      theMap.setLayoutProperty(
        `${e.target.id}-output`,
        "visibility",
        e.target.checked ? "visible" : "none"
      );
    });
  });
}
