//import maplibregl from 'maplibre-gl';

async function getGenerators(){
    response = await fetch(new Request('./generators.json'), {
        mode: 'no-cors'
    });

    //console.log(response);

    let generators = await response.json();
    // console.log(bmus);
    return generators; 
}

async function getPNs(bmusToChase){
    const date = new Date();
    yyyymmdd = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    offset = date.getTimezoneOffset();
    offset *= -1;
    
    
    settlementPeriod = (date.getHours() + offset/60) * 2 + ((Math.floor(date.getMinutes() / 30)+1));
    console.log(settlementPeriod);
    //settlementPeriod = (48*date.getHours()/24);
    console.log(yyyymmdd);
    response = await fetch(new Request(`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=${yyyymmdd}&settlementPeriod=${settlementPeriod}${bmusToChase}format=json`));

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

function addFuelLayer(sourceStuff, fillLayerStuff, lineLayerStuff, theMap) {
    // Add the source to the map
    theMap.addSource(sourceStuff.name, {
        type: 'geojson',
        data: sourceStuff.data,
        filter: ['==', ['get', 'primaryFuel'], sourceStuff.name]
    });
    // Add a fill layer with some transparency
    theMap.addLayer({
        id: fillLayerStuff.name,
        type: 'fill',
        source: sourceStuff.name,
        paint: {
            'fill-color': colorPalette[sourceStuff.name],
            'fill-opacity': 0.4
        }    
    });
}

function getGenInfo(clickEvent){
    const coordinates = clickEvent.features[0].geometry.coordinates.slice();
    const description = `<strong> ${clickEvent.features[0].properties.name} </strong>` +
        `<p> Installed Capacity: ${clickEvent.features[0].properties.installedCapacity} MW </p>` +
        `<p> Primary Fuel: ${clickEvent.features[0].properties.primaryFuel} </p>`;

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

function checkOutMap(gens){
    /**
     * Each PN consists of a BMU, the settlement period/date, output from and output to. I want to create a map object for each BMU that uses
     * the settlement period/date as the key, and the "output to" as the value. The map object should include the last 48 hours of this data. 
     * The map object should then be added to the generator concerned
     * */

    for(i in gens){
        for(j in gens.relevantBMUs){
            let gensWithBMUs= {};

        }

    }
}