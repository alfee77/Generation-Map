//import maplibregl from 'maplibre-gl';

async function getGenerators(){
    response = await fetch(new Request('./generators.json'), {
        mode: 'no-cors'
    });

    //console.log(response);

    let generators = await response.json();
    //console.log(generators);
    return generators; 
}

async function getPNs(bmusToChase){
    const date = new Date();
    yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    offset = date.getTimezoneOffset();
    offset *= -1;
    
    
    settlementPeriod = (date.getHours()) * 2 + ((Math.floor(date.getMinutes() / 30)+1));
    
    
    response = await fetch(new Request(`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=${yyyymmdd}&settlementPeriod=${settlementPeriod}${bmusToChase}format=json`));
    
    let PNs = await response.json();
    console.log(`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=${yyyymmdd}&settlementPeriod=${settlementPeriod}${bmusToChase}format=json`);
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



function getGenInfo(clickEvent){
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

