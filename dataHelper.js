let generators;
let myChart;
let chartArray = [];
let chartCanvas;

/**
 * getGenerators() gets all generators from the generators.json file. It then collates all the BMUs from the json file, and formulates a string to seed the
 * request to the Elexon API to get all Physical Notifications (PNs) for each BMU. It then embeds the PNs for that
 * given BMU for the 24 hours up to the current settlement period
 *
 * @return generators
 */
export async function getGenerators() {
  let response = await fetch(new Request("./generators.json"), {
    mode: "no-cors",
  });

  generators = await response.json();

  let bmuString = "";

  //This loop iterates through the generators from the JSON file and collates the bmus array for each generator.
  //It then creates a string of BMU units to facilitate the request to the Elexon API to get all relevant Physical Notices (PNs).
  generators.forEach((generator) => {
    generator.bmus.forEach((bmu) => {
      if (!bmu === "") {
        bmuString += "&bmUnit=" + bmu;
      }
    });
  });
  //complete the BMU String
  bmuString += "&";

  //get the PNs associated with each BMU from the Elexon API
  let allPNs = await getPNs(bmuString); //Note: PN data is stored in a data[] array within allPNs

  //Now we have the latest PNs for each BMU, we can create an array of PNs against the given BMU in the generator's object.
  generators.forEach((generator) => {
    //This loop iterates through the generators JSON file and collates the bmus array for each generator.
    generator.bmusObjArray = [];
    generator.bmus.forEach((bmu) => {
      //This inner forEach loop iterates through the bmus array in the generator JSON file
      if (!bmu == "") {
        let bmusObj = {
          bmuId: bmu,
          bmuPNs: [],
        };

        allPNs.forEach((PN) => {
          //This loop iterates through the PNs and finds the relevant BMU for each generator. It then adds the relevant PNs to the generator object.

          if (PN.bmUnit === bmu) {
            bmusObj.bmuPNs.push(PN);
          }
        });
        generator.bmusObjArray.push(bmusObj);
      }
    });
    generator.totalOutput = 0;

    if (generator.bmusObjArray.length > 0) {
      generator.bmusObjArray.forEach((bmuObjArray) => {
        generator.totalOutput += bmuObjArray.bmuPNs[0].levelTo;
      });
    }
  });

  return generators;
}

async function getPNs(bmusToChase) {
  const date = new Date();
  const dateFrom = new Date(date - 24 * 60 * 60 * 1000);
  let offset = date.getTimezoneOffset();
  offset *= -1;

  const yyyymmdd_dateFrom =
    dateFrom.getFullYear() +
    "-" +
    (dateFrom.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    dateFrom.getDate().toString().padStart(2, "0");

  const yyyymmdd_dateTo =
    date.getFullYear() +
    "-" +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    date.getDate().toString().padStart(2, "0");

  const settlementPeriodFrom =
    48 +
    (date.getHours() + offset / 60) * 2 +
    (Math.floor(date.getMinutes() / 30) + 1 - 48);

  const settlementPeriodTo =
    (date.getHours() + offset / 60) * 2 +
    (Math.floor(date.getMinutes() / 30) + 1);

  let response = await fetch(
    new Request(
      `https://data.elexon.co.uk/bmrs/api/v1/datasets/PN/stream?from=${yyyymmdd_dateFrom}&to=${yyyymmdd_dateTo}&settlementPeriodFrom=${settlementPeriodFrom}&settlementPeriodTo=${settlementPeriodTo}${bmusToChase}`
    )
  );

  let PNs = await response.json();

  return PNs;
}

export function getGenInfo(clickEvent, theMap) {
  if (chartArray.length > 0) {
    chartArray.forEach((chart) => {
      chart.destroy();
    });
  }
  const coordinates = clickEvent.features[0].geometry.coordinates.slice();

  let description =
    `<strong> ${clickEvent.features[0].properties.name} </strong>` +
    `<p> Installed Capacity: ${clickEvent.features[0].properties.installedCapacity} MW </p>` +
    `<p> Primary Fuel: ${clickEvent.features[0].properties.primaryFuel} </p>`;

  // Ensure that if the map is zoomed out such that multiple
  // copies of the feature are visible, the popup appears
  // over the copy being pointed to.
  while (Math.abs(clickEvent.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += click.EventlngLat.lng > coordinates[0] ? 360 : -360;
  }

  //find the entry in the generators array that matches the clicked feature
  let ind = generators.indexOf(
    generators.find(
      (gen) => gen.siteName === clickEvent.features[0].properties.name
    )
  );

  //loop through the bmusObjArray for the generator and display the chart for each BMU
  if (generators[ind].bmusObjArray.length < 1) {
    window.parent.document.getElementById(
      "chart-header"
    ).innerHTML = `<h4>${generators[ind].siteName} has no Balancing Mechanism Unit(s)</h4>`;
    description += `<p> No output recorded (no BMU)`;
  } else {
    description += `<p> Output: ${clickEvent.features[0].properties.totalOutput} MW </p>`;
  }

  let i = 0;
  generators[ind].bmusObjArray.forEach((bmu) => {
    chartCanvas = window.parent.document.getElementById(`myChart${i}`);
    if (chartCanvas) {
      //create data array for this bmu. Array of objects containing multiple x y values - x timeTo, y levelTo
      let bmuChartDataPNs = [];

      bmu.bmuPNs.forEach((PN) => {
        bmuChartDataPNs.push({
          x: PN.timeTo,
          y: PN.levelTo,
        });
      });
      displayChart(chartCanvas, ind, i, bmuChartDataPNs);
    } else {
      console.warn(`Chart canvas with id myChart${i} not found.`);
    }
    i++;
  });

  new maplibregl.Popup()
    .setLngLat(coordinates[0][0])
    .setHTML(description)
    .addTo(theMap);
}

function displayChart(chartCanvas, genInd, bmuInd, dataPassedPNs) {
  window.parent.document.getElementById(
    "chart-header"
  ).innerHTML = `<h4>${generators[genInd].siteName} Balancing Mechanism Unit(s)</h4>`;

  //setup block
  const data = {
    datasets: [
      {
        label: generators[genInd].bmusObjArray[bmuInd].bmuId,
        data: dataPassedPNs,
        borderColor: colorPalette[generators[genInd].primaryFuel],
        backgroundColor: colorPalette[generators[genInd].primaryFuel],
        pointRadius: 0,
        borderWidth: 1,
        fill: false,
        tension: 0.1,
      },
    ],
  };

  //config block
  const config = {
    type: "line",
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
          position: "top",
        },
        title: {
          display: true,
          text: `${generators[genInd].siteName}, BM Unit - ${generators[genInd].bmusObjArray[bmuInd].bmuId}`,
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
          },
          title: {
            display: false,
            text: "Time",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Output (MW)",
          },
        },
      },
    },
  };

  myChart = new Chart(chartCanvas, config);

  chartArray.push(myChart);
}

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
