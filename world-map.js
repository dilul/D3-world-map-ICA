const w = 3000;
const h = 1250;

const modalWidth = 1500;
const modalHeight = 1200;

var svg = d3
  .select("#map-container")
  .append("svg")
  .attr("width", w)
  // .attr("width", $("#map-container").width())
  .attr("height", h)
  .attr("style", "border:3px solid blue ");

var div = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// var projection = d3.geoMercator()
// .center([0, 5 ])
// .scale(150)
// .rotate([-180,0]);

// var path = d3.geoPath()
// .projection(projection);

var projection = d3
  .geoEquirectangular()
  .center([0, 15])
  .scale([w / (2 * Math.PI)])
  .translate([w / 2, h / 2]);

var path = d3.geoPath().projection(projection);

var modalDiv = d3
  .select("body")
  .append("div")
  .attr("class", "modal")
  .attr("id", "lineChart")
  .style("visibility", "hidden")
  .style("position", "absolute")
  .attr("width", modalWidth)
  .attr("height", modalHeight);

// .style("visibility", "hidden");

d3.json("custom.geo.json")
  .then(function (json) {
    //Bind data and create one path per GeoJSON feature
    countriesGroup = svg.append("g").attr("id", "map");

    //   countriesGroup
    //     .append("rect")
    //     .attr("x", 0)
    //     .attr("y", 0)
    //     .attr("width", w)
    //     .attr("height", h);

    //Add Sphere
    countriesGroup
      .append("path")
      .attr("class", "sphere")
      .style("fill", "lightblue")
      .attr("d", path({ type: "Sphere" }));

    countriesGroup
      .selectAll("path")
      .data(json.features)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", path)
      .style("stroke", "black")
      //.attr("class",function(d){ return "Country" })
      .style("opacity", 0.8)
      .attr("id", function (d, i) {
        return "country" + d.properties.iso_a3;
      })
      .on("mouseover", function (event, d) {
        bbox = this.getBBox();

        d3.select(this).classed("hovernode", true);

        div
          .transition()
          .duration(200)
          .attr("width", function (d) {
            return bbox.width + 4;
          })
          .attr("height", function (d) {
            return bbox.height;
          })
          .style("opacity", 0.9);

        div
          .html(d.properties.name + "<br/>")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function (d) {
        d3.select(this).classed("hovernode", false);

        div.transition().duration(500).style("opacity", 0);
      })
      .on("click", function (event, d) {
        d3.select(this).classed("hovernode", false);
        d3.selectAll(".country").classed("country-on", false);

        d3.select("#lineChart.modal").style("display", "block");

        const modal = createModal(event, d);
        getDataForSelectedCountry(d.properties.name, modal);
      });
  })
  .catch(function (error) {
    console.log(error);
  });


function createModal(event, d) {
  var modalHeader = modalDiv
    .append("div")
    .append("header")
    .attr("class", "modal-header")
    .attr("id","modal-header");

  let modalHeading = modalHeader.append("h2").attr("class", "modal.h2");

  var modal = modalDiv
    .append("svg")
    .attr("class", "modal")
    .attr("id", "content")
    .attr("width", modalWidth)
    .attr("height", modalHeight)
    .style("z-index", "10");

  var closeButton = modalHeader
    .append("button")
    .attr("type", "button")
    .attr("class", "modal-close")
    .on("click", function (event, d) {
      d3.select("#content").remove();
      d3.select("#modal-header").remove();
      d3.select("#lineChart.modal").style("display", "none");
    });

  closeButton
    .append("img")
    .attr("src", "close.png")
    .attr("width", 72)
    .attr("height", 63);

  modalDiv
    .transition()
    .duration(200)
    .style("opacity", 0.9)
    .style("visibility", "visible")
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 10 + "px");

  //Add modal header
  modalHeading.text("International Students Trend of " + d.properties.name);

  return modal;
}


function getDataForSelectedCountry(selectedCountry, modal) {
  console.log(selectedCountry);

  //  d3.json("Births_2017.json").then(buildChart);
  d3.json("convertcsv updated.json").then((dataSet) =>
    buildLineChart(dataSet, selectedCountry, modal)
  );
}

function buildLineChart(dataSet, selectedCountry, modal) {
  let dataSetY = [];
  let yMax = [];

  // set the dimensions and margins of the graph
  var margin = { top: 30, right: 30, bottom: 30, left: 80 },
    graphWidth = modalWidth - margin.left - margin.right,
    graphHeight = modalHeight - margin.top - margin.bottom;

  console.log(selectedCountry);
  const studentCount = new Map();

  dataSet.forEach(function (dataSet) {
    studentCount.set(dataSet.country, dataSet.values);
  });

  //Check whether the selected Country data is available
  if (studentCount.has(selectedCountry)) {
    //Get the data related to the selected Country
    const countryData = studentCount.get(selectedCountry);

    console.log(countryData);

    countryData.forEach(function (d) {
      dataSetY.push(d.year);
      yMax.push(d.count);
    });

    //****SCALE THE DATA****

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(dataSetY))
      .range([0, graphWidth]);

    //set min y value as zero
    const yScale = d3
      .scaleLinear()
      .domain([d3.min(yMax) - 100, d3.max(yMax)])
      .range([graphHeight, 0]);

    //****BUILD THE AXES****
    //format years as date
    const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d"));

    const yAxis = d3.axisLeft(yScale);

    const graphGroup = modal
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`)
      .attr("id", "graph-group");

    const axesGroup = graphGroup.append("g").attr("id", "axes-group");

    axesGroup
      .append("g")
      .attr("id", "x-axis")
      .attr("class", "axes")
      .attr("transform", `translate(${0}, ${graphHeight})`)
      .call(xAxis)
      .attr("class", "label");
    // .selectAll("text")
    // .style("text-anchor", "end")
    // .attr("dx", "-1em")
    // .attr("dy", "-0.5em")
    // .attr("transform", "rotate(-90)");

    axesGroup
      .append("g")
      .attr("id", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .attr("class", "label");

    const colourScale = d3.scaleOrdinal(d3.schemeCategory10);

    // const lines =
    // graphGroup
    //     .selectAll('path.line')
    //     .data(countryData)
    //     .enter()
    //         .append("path")
    //             // .attr('id', )
    //             .attr('class', 'line')
    //             .attr('stroke', function(d, colIndex) {return colourScale(colIndex) })
    //             .attr('stroke-width', 2)
    //             .style("fill", "none")
    //             .style('opacity', 0.5)
    //             .attr('d',
    //                 d3.line()//.curve(d3.curveNatural)
    //                     .x([1300,1500,1400])
    //                     .y([1400,1300,2000])

    //                 );

    graphGroup
      .append("path")
      .datum(countryData)
      .attr("fill", "none")
      .attr("stroke", colourScale)
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return xScale(d.year);
          })
          .y(function (d) {
            return yScale(d.count);
          })
      );
  }
}


function convertDataset(dataset) {
  const dataMap = d3.map(dataSet, (value) => {
    const data = { country: value.Country, values: [] };
    for (let index = 2015; index <= 2023; index++) {
      const val = { year: index, count: value[index] };
      data.values.push(val);
    }
    return data;
  });
  console.log(JSON.stringify(dataMap));
}
