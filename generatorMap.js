//import maplibregl from 'maplibre-gl';

let generators;
let myChart;
let chartArray = [];

async function getGenerators() {
    response = await fetch(new Request('./generators.json'), {
        mode: 'no-cors'
    });

    //console.log(response);

    generators = await response.json();
    //console.log(generators);
    let bmuString = "";
    for (i in generators) {
        //This loop iterates through the generators JSON file and collates the bmus array for each generator.
        //It then creates a string of BMU units to facilitate the request to the Elexon API to get all relevant Physical Notices (PNs).
        for (j in generators[i].bmus) {
            //This inner for loop iterates through the bmus array in the generator JSON file and creates a string of BMU units
            //to facilitate the request to the Elexon API to get all relevant Physical Notices (PNs).
            if (!generators[i].bmus[j] == "") {
                bmuString += "&bmUnit=" + generators[i].bmus[j];
            }
        }
    }
    //complete the BMU String
    bmuString += "&";
    //console.log(bmuString);


    //get the PNs associated with each BMU from the Elexon API
    let allPNs = await getPNs(bmuString); //Note: PN data is stored in a data[] array within allPNs

    //Now we have the latest PNs for each BMU, we can create an array of PNs against the given BMU in the generators object.
    for (i in generators) {
        //This loop iterates through the generators JSON file and collates the bmus array for each generator.

        generators[i].bmusObjArray = [];
        for (j in generators[i].bmus) {
            //This inner for loop iterates through the bmus array in the generator JSON file
            //console.log(generators[i]);
            if (!generators[i].bmus[j] == "") {
                let bmusObj = {
                    bmuId: generators[i].bmus[j],
                    bmuPNs: [],
                };

                for (k in allPNs) {

                    //This loop iterates through the PNs and finds the relevant BMU for each generator. It then adds the relevant PNs to the generator object.

                    if (allPNs[k].bmUnit == generators[i].bmus[j]) {

                        bmusObj.bmuPNs.push(allPNs[k]);

                    }
                }

                generators[i].bmusObjArray.push(bmusObj);
            }
        }
        generators[i].totalOutput = 0;

        if (generators[i].bmusObjArray.length > 0) {
            for (m in generators[i].bmusObjArray) {
                //console.log(generators[i].bmusObjArray[m]);
                generators[i].totalOutput += generators[i].bmusObjArray[m].bmuPNs[0].levelTo;
            }
        }
        //console.log(generators[i]);
        //if(generators[i].totalOutput > 0) console.log(generators[i].siteName + " output is " + generators[i].totalOutput + "MW");
    }

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
            units: 'meters',
    };

    for(i in generators){
        //The first part of the for loop iterates through the generators JSON file and creates a capacityCircle for each generator. It then adds the generated 
        //circle to the generatorsLocation string (this is later converted to a GeoJSON object for use in the mapping of the circles onto the map).
        // Generate a polygon using turf.circle
        // See https://turfjs.org/docs/#circle

        let capacityCircleRadius = parseFloat(generators[i].installedCapacity)*20;
        let capacityCircle = {};
        capacityCircle = turf.circle([parseFloat(generators[i].lon), parseFloat(generators[i].lat)], capacityCircleRadius, circleOptions);
        capacityCircle.properties.name = generators[i].siteName;
        capacityCircle.properties.installedCapacity = generators[i].installedCapacity;
        capacityCircle.properties.primaryFuel = generators[i].primaryFuel;
        capacityCircle.properties.totalOutput = generators[i].totalOutput;
        capacityCircle.properties.LngLatLike = [parseFloat(generators[i].lon), parseFloat(generators[i].lat)];
        generatorLocations += JSON.stringify(capacityCircle) + ",";

        //This next bit creates the GeoJSON string for the generator outputs. It is similar to the above, but uses the totalOutput value instead of the installedCapacity value.
        let outputCircleRadius = 20 * generators[i].totalOutput;
        let outputCircle = {};
        outputCircle = turf.circle([parseFloat(generators[i].lon), parseFloat(generators[i].lat)], outputCircleRadius, circleOptions);
        outputCircle.properties.name = generators[i].siteName;
        outputCircle.properties.primaryFuel = generators[i].primaryFuel;
        outputCircle.properties.totalOutput = generators[i].totalOutput;
        outputCircle.properties.LngLatLike = [parseFloat(generators[i].lon), parseFloat(generators[i].lat)];
        generatorOutputs += JSON.stringify(outputCircle) + ",";

        
    }//for

    //Complete the GeoJSON string for each circle/generation type.
    generatorLocations = generatorLocations.substring(0, generatorLocations.length - 1) + `\]}`;
    generatorLocationsJSON = JSON.parse(generatorLocations);

    //Complete the GeoJSON string for each generators output.
    generatorOutputs = generatorOutputs.substring(0, generatorOutputs.length - 1) + `\]}`;
    generatorOutputsJSON = JSON.parse(generatorOutputs);
    
    layerArray=[]; //An array to store the different generation layers.

    generatorLocationsJSON.features.forEach((feature) => {
        const layerID = feature.properties['primaryFuel'];

        // Add a layer for this symbol type if it hasn't been added already.
        if (!layerArray.includes(layerID)) {
            layerArray.push(layerID);
        }
    });

    /**
     * Add the generator locations layers to the map. There is a layer for each type of generator.
     * The data is in GeoJSON format, so we can add it as a source
     * and then add a fill layer and an outline layer to display it.
     **/
    for (eachLayer in layerArray){
        //console.log(layerArray[eachLayer]);
        let capacityLayerObject = {
            name: `${layerArray[eachLayer]}`,
            data: generatorLocationsJSON,
            fillName: `${layerArray[eachLayer]}-fillLayer`,
            lineName: `${layerArray[eachLayer]}-lineLayer`,
        };

        addCapacityLayer(capacityLayerObject, map);

        let outputLayerObject = {
            name: `${layerArray[eachLayer]}-output`,
            data: generatorOutputsJSON,
            fillName: `${layerArray[eachLayer]}`,
        };

        addOutputLayer(outputLayerObject, map);

        // Add checkbox and label elements for the layer.
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = layerArray[eachLayer];
        input.checked = true;
        filterGroup.appendChild(input);

        const label = document.createElement('label');
        label.setAttribute('for', layerArray[eachLayer]);
        label.textContent = layerArray[eachLayer];
        filterGroup.appendChild(label);

        // When the checkbox changes, update the visibility of the layer.
        input.addEventListener('change', (e) => {    
            map.setLayoutProperty(
                `${e.target.id}-lineLayer`,
                'visibility',
                e.target.checked ? 'visible' : 'none'
            );
            map.setLayoutProperty(
                `${e.target.id}-fillLayer`,
                'visibility',
                e.target.checked ? 'visible' : 'none'
            );
            map.setLayoutProperty(
                `${e.target.id}-output`,
                'visibility',
                e.target.checked ? 'visible' : 'none'
            );
        });
    }
    return generators;
}

async function getPNs(bmusToChase) {
    const date = new Date();
    yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    offset = date.getTimezoneOffset();
    offset *= -1;
    yyyymmdd_dateFrom = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + (date.getDate() - 1).toString().padStart(2, '0');
    yyyymmdd_dateTo = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');

    settlementPeriod = ((date.getHours() + offset / 60) * 2) + ((Math.floor(date.getMinutes() / 30) + 1));
    settlementPeriodFrom = 48 + ((date.getHours() + offset / 60) * 2) + ((Math.floor(date.getMinutes() / 30) + 1) - 48);
    settlementPeriodTo = ((date.getHours() + offset / 60) * 2) + ((Math.floor(date.getMinutes() / 30) + 1));

    response = await fetch(new Request(`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN/stream?from=${yyyymmdd_dateFrom}&to=${yyyymmdd_dateTo}&settlementPeriodFrom=${settlementPeriodFrom}&settlementPeriodTo=${settlementPeriodTo}${bmusToChase}`));

    let PNs = await response.json();

    return PNs;
}

const colorPalette = {
    "Wind": "#44d444",
    "Biomass": "#ffb399",
    "Solar": "#ff33ff",
    "Nuclear": "#ffff00",
    "Natural Gas": "#00b3e6",
    "Pumped hydro": "#2e8b57",
    "Hydro": "#2e8b57",
    "Coal": "#000000",
    "Diesel/Gas Oil": "#808080",
    "Sour Gas": "#b34d4d",
}

function addCapacityLayer(capacityLayer, theMap) {
    // Add the source to the map

    theMap.addSource(capacityLayer.name, {
        type: 'geojson',
        data: capacityLayer.data,
        filter: ['==', ['get', 'primaryFuel'], capacityLayer.name]
    });
    // Add a line layer
    theMap.addLayer({
        id: capacityLayer.lineName,
        type: 'line',
        source: capacityLayer.name,
        paint: {
            'line-color': "#A9A9A9",
            'line-width': 1
        }
    });
    // Add a fill layer with full transparency - this allows the click event to work
    theMap.addLayer({
        id: capacityLayer.fillName,
        type: 'fill',
        source: capacityLayer.name,
        paint: {
            'fill-color': colorPalette[capacityLayer.name],
            'fill-opacity': 0
        }
    });
}

function addOutputLayer(outputLayer, theMap) {
    // Add the source to the map

    theMap.addSource(outputLayer.name, {
        type: 'geojson',
        data: outputLayer.data,
        filter: ['==', ['get', 'primaryFuel'], outputLayer.name.substring(0, outputLayer.name.length - 7)]
    });

    // Add a fill layer with some transparency

    theMap.addLayer({
        id: outputLayer.fillName + "-output",
        type: 'fill',
        source: outputLayer.name,
        paint: {
            'fill-color': colorPalette[outputLayer.fillName],
            'fill-opacity': 0.8
        }
    });
}

function getGenInfo(clickEvent) {
    if(chartArray.length > 0){
        for (let i = 0; i < chartArray.length; i++) {
            chartArray[i].destroy();
        }
    }
    const coordinates = clickEvent.features[0].geometry.coordinates.slice();

    const description = `<strong> ${clickEvent.features[0].properties.name} </strong>` +
        `<p> Installed Capacity: ${clickEvent.features[0].properties.installedCapacity} MW </p>` +
        `<p> Primary Fuel: ${clickEvent.features[0].properties.primaryFuel} </p>` +
        `<p> Output: ${clickEvent.features[0].properties.totalOutput} MW </p>`;
        

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(clickEvent.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += click.EventlngLat.lng > coordinates[0] ? 360 : -360;
    }

    //find the entry int he generators array that matches the clicked feature
    let ind = generators.indexOf(generators.find(gen => gen.siteName === clickEvent.features[0].properties.name));
    console.log(`${generators[ind].siteName} has ${generators[ind].bmusObjArray.length} BMUs`);
    
    //loop through the bmusObjArray for the generator and display the chart for each BMU
    for (i in generators[ind].bmusObjArray){
        chartCanvas = window.parent.document.getElementById(`myChart${i}`);
        console.log(chartCanvas);
        if (chartCanvas) {
            displayChart(chartCanvas, ind, i);
        } else {
            console.warn(`Chart canvas with id myChart${i} not found.`);
        }
        //displayChart(window.parent.document.getElementById('myChart'+i+1), clickEvent.features[0].properties.name);
    }
    
    new maplibregl.Popup()
        .setLngLat(coordinates[0][0])
        .setHTML(description)
        .addTo(map);
};

function displayChart(chartCanvas, index, j){
    console.log(`call to print my chart${j}`);

    // if (myChart) {
    //     console.log("boobs");
    //     myChart.destroy();
    // }

    console.log(generators[index].bmusObjArray[j].bmuId);
    console.log(generators[index].bmusObjArray[j].bmuPNs.map(row => row.levelTo));
    console.log(generators[index].bmusObjArray[j].bmuPNs.map(row => row.timeTo));
    

    myChart = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: generators[0].bmusObjArray[j].bmuPNs.map(row => row.timeTo),
            datasets: [{
                label: generators[index].bmusObjArray[j].bmuId,
                data: generators[index].bmusObjArray[j].bmuPNs.map(row => row.levelTo),
                borderWidth: 0.5,
                pointRadius: 1.5,
            }]
        },
        options: {
            scales: {
                // x: {
                //     type: 'timeseries',
                //     unit: 'hour'
                // },
                y: {
                    beginAtZero: true
                },
                
            },
            maintainAspectRatio: true
        }

    });

    chartArray.push(myChart);
    // //console.log(doc.getElementById("myChart"));
    // //console.log(generators[0].bmusObjArray[0].bmuPNs[0].timeTo);
    // //console.log(document.getRootNode());
    
    
}