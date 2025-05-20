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

// function getGenerators(){
//     fetch(new Request('./generators.json'))
//     .then(function(response){
//         if(response.ok == true)
//             return response.json()
//     })
//     .then(function(data){
//         console.log("Fucking generators 1: " + data);
//         return data;
//     })
// }

async function getPNs(bmusToChase){
    const date = new Date();
    yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    offset = date.getTimezoneOffset();
    offset *= -1;
    yyyymmdd_dateFrom = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + (date.getDate()-1).toString().padStart(2, '0');
    yyyymmdd_dateTo = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    
    settlementPeriod = ((date.getHours()+offset/60) * 2) + ((Math.floor(date.getMinutes() / 30) + 1));
    settlementPeriodFrom = 48 + ((date.getHours()+offset/60) * 2) + ((Math.floor(date.getMinutes() / 30)+1) - 48);
    settlementPeriodTo = ((date.getHours()+offset/60) * 2) + ((Math.floor(date.getMinutes() / 30) + 1));
    
    console.log(`Date From: ${yyyymmdd_dateFrom}`);
    console.log(`Settlement Period From: ${settlementPeriodFrom}`);
    console.log(`Date To: ${yyyymmdd_dateTo}`);
    console.log(`Settlement Period To: ${settlementPeriodTo}`);
    
    //response = await fetch(new Request(`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=${yyyymmdd}&settlementPeriod=${settlementPeriod}${bmusToChase}format=json`));
    
    response = await fetch(new Request(`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN/stream?from=${yyyymmdd_dateFrom}&to=${yyyymmdd_dateTo}&settlementPeriodFrom=${settlementPeriodFrom}&settlementPeriodTo=${settlementPeriodTo}${bmusToChase}`));

    let PNs = await response.json();
    
    console.log(PNs);

    return PNs;
}

// function getPNs(bmusToChase){
//     const date = new Date();
//     yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
//     offset = date.getTimezoneOffset();
//     offset *= -1;
//     yyyymmdd_dateFrom = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + (date.getDate()-1).toString().padStart(2, '0');
//     yyyymmdd_dateTo = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
//     yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    
//     settlementPeriod = ((date.getHours()+offset/60) * 2) + ((Math.floor(date.getMinutes() / 30) + 1));
//     settlementPeriodFrom = 48 + ((date.getHours()+offset/60) * 2) + ((Math.floor(date.getMinutes() / 30)+1) - 48);
//     settlementPeriodTo = ((date.getHours()+offset/60) * 2) + ((Math.floor(date.getMinutes() / 30) + 1));

//     fetch(`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN/stream?from=${yyyymmdd_dateFrom}&to=${yyyymmdd_dateTo}&settlementPeriodFrom=${settlementPeriodFrom}&settlementPeriodTo=${settlementPeriodTo}${bmusToChase}`)
//     .then(function(response){
//         return response.json()
//     })
//     .then(function(data){
//         return data;
//     })
// }

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
