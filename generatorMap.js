//import maplibregl from 'maplibre-gl';

let generators;

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

    const ctx = document.getElementById("myChart");
    console.log(generators[0].bmusObjArray[0].bmuPNs[0].timeTo);
    myChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: generators[0].bmusObjArray[0].bmuPNs.map(row => row.timeTo),
            datasets: [{
                label: 'MW',
                data: generators[20].bmusObjArray[0].bmuPNs.map(row => row.levelTo),
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            maintainAspectRatio: false
        }

    });
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

    //console.log(PNs);

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
    new maplibregl.Popup()
        .setLngLat(coordinates[0][0])
        .setHTML(description)
        .addTo(map);
};

