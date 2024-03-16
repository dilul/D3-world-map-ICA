const maxWidth = window.innerWidth * 0.9;
const maxHeight = window.innerHeight * 0.9;
const ratio = 0.5;

let w = maxWidth;
let h = maxWidth * ratio;

if (h > maxHeight) {
  h = maxHeight;
  w = h / ratio;
}

const modalWidth = w * 0.4;
const modalHeight = modalWidth;

let modalPositionX = w / 2;
let modalPositionY = h / 2;

const studentCount = new Map();

function populateStudentData() {
  d3.json("international-student.json").then((dataSet) => {
    dataSet.forEach(function (dataSet) {
      studentCount.set(dataSet.country, dataSet.values);
    });
  });
}

// var projection = d3.geoMercator()
// .center([0, 5 ])
// .scale(150)
// .rotate([-180,0]);

// var path = d3.geoPath()
// .projection(projection);

var projection = d3
  .geoEquirectangular()
  .center([0, 0])
  .scale([w / (2 * Math.PI)])
  .translate([w / 2, h / 2]);

var path = d3.geoPath().projection(projection);

// .style("visibility", "hidden");

d3.json("custom.geo.json")
  .then(function (json) {
    const mapContainer = d3.select("#map-container");
    const contRect = mapContainer.node().getBoundingClientRect();
    const svg = mapContainer
      .append("svg")
      .attr("width", contRect.width)
      // .attr("width", $("#map-container").width())
      .attr("height", contRect.height);

    const div = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    //Bind data and create one path per GeoJSON feature
    const countriesGroup = svg.append("g").attr("id", "map");

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
      .style("fill", "rgb(212, 240, 248)")
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

        const modalDiv = createModalDiv(event, d);
        const selectedCountry = [
          d.properties.name,
          d.properties.name_ciawf,
          d.properties.name_long,
          d.properties.formal_en,
          d.properties.name_en,
          d.properties.name_sort,
        ];
        buildLineChart(selectedCountry, modalDiv, event);
      });

    populateStudentData();
  })
  .catch(function (error) {
    console.log(error);
  });

function createModalDiv(event, d) {
  d3.select("#lineChart.modal").remove();

  var modalDiv = d3
    .select("body")
    .append("div")
    .attr("class", "modal")
    .attr("id", "lineChart")
    .style("position", "absolute")
    .attr("width", modalWidth)
    .attr("height", modalHeight);

  var modalHeader = modalDiv
    .append("div")
    .append("header")
    .attr("class", "modal-header")
    .attr("id", "modal-header");

  var closeButton = modalHeader
    .append("button")
    .attr("type", "button")
    .attr("class", "modal-close")
    .on("click", function (event, d) {
      modalDiv.remove();
    });

  closeButton
    .append("img")
    .attr("src", "close.png")
    .attr("width", 72)
    .attr("height", 63);

  //Add modal header
  let modalHeading = modalHeader.append("h2").attr("class", "modal.h2");
  modalHeading.text("International Students Trend of " + d.properties.name);

  modalDiv
    .style("left", modalPositionX + "px")
    .style("top", modalPositionY + "px");

  return modalDiv;
}

function buildLineChart(selectedCountry, modalDiv, event) {
  let dataSetY = [];
  let yMax = [];

  // set the dimensions and margins of the graph
  var margin = { top: 30, right: 30, bottom: 30, left: 80 },
    graphWidth = modalWidth - margin.left - margin.right,
    graphHeight = modalHeight - margin.top - margin.bottom;

  let available = false;
  let countryData;
  for (let i = 0; i < selectedCountry.length && !available; i++) {
    if (studentCount.has(selectedCountry[i])) {
      available = true;
      countryData = studentCount.get(selectedCountry[i]);
    }
  }

  //Check whether the selected Country data is available
  if (available) {
    // modalPositionX = event.pageX + modalWidth > w ? event.pageX - modalWidth : event.pageX
    // modalPositionY = event.pageY + modalHeight > h ? event.pageY - modalHeight : event.pageY
    modalPositionX = w / 2 - modalWidth / 2;
    modalPositionY = h / 2 - modalHeight / 2;

    //Get the data related to the selected Country
    // const countryData = studentCount.get(country);

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

    var modal = modalDiv
      .append("svg")
      .attr("class", "modal")
      .attr("id", "content")
      .attr("width", modalWidth)
      .attr("height", modalHeight)
      .style("z-index", "10");

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

    // add the dots with tooltips

    var lineDiv = d3
      .select("body")
      .append("div")
      .attr("class", "lineTooltip")
      .style("opacity", 0);

    graphGroup
      .selectAll("dot")
      .data(countryData)
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("cx", function (d) {
        return xScale(d.year);
      })
      .attr("cy", function (d) {
        return yScale(d.count);
      })
      .on("mouseover", function (event, d) {
      
        bbox = this.getBBox;
        lineDiv
          .transition()
          .duration(200)
          .attr("width", function (d) {
            return bbox.width + 4;
          })
          .attr("height", function (d) {
            return bbox.height;
          })
          .style("opacity", 0.9);
        lineDiv
          .html(selectedCountry[0] + ": year " + d.year + "<br/>" + "Student count :" + d.count)
          .style("left", event.pageX + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function (d) {
        lineDiv.transition().duration(500).style("opacity", 0);
      });

  } else {
    modalDiv.append("div").append("h4").html("Data is not available");
    const modalDivRect = modalDiv.node().getBoundingClientRect();
    modalPositionX = w / 2 - modalDivRect.width / 2;
    modalPositionY = h / 2 - modalDivRect.height / 2;
  }

  modalPositionX = modalPositionX < 0 ? 10 : modalPositionX;
  modalPositionY = modalPositionY < 0 ? 10 : modalPositionY;

  modalDiv
    .transition()
    .duration(200)
    .style("opacity", 0.96)
    .style("visibility", "visible")
    .style("left", modalPositionX + "px")
    .style("top", modalPositionY + "px");
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
