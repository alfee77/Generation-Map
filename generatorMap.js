//import maplibregl from 'maplibre-gl';

async function getBMUs(){
    response = await fetch(new Request('./testImportJSON.json'), {
        mode: 'no-cors'
    });

    let bmus = await response.json();
    // console.log(bmus);
    return bmus;
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

