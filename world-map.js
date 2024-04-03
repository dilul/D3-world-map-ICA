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

let totalStudent;

const studentCount = new Map();

const colorScale = d3
  .scaleThreshold()
  .domain([0,100,1000,4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000])
  .range(d3.schemeOranges[9]);


populateStudentData();
buildChoreplethMap();


function populateStudentData() {
  d3.json("international-student.json").then((dataSet) => {
    dataSet.forEach(function (dataSet) {
      const total = dataSet.values
        .map((val) => val.count)
        .reduce((a, b) => a + b);
      const values = { ...dataSet, total };
      studentCount.set(dataSet.country, values);
    });
    console.log(studentCount);
  });
}

// var projection = d3.geoMercator()
// .center([0, 5 ])
// .scale(150)
// .rotate([-180,0]);

function buildChoreplethMap() {

  var projection = d3
    .geoEquirectangular()
    .center([0, 0])
    .scale([w / (2 * Math.PI)])
    .translate([w / 2, h / 2]);

  var path = d3.geoPath().projection(projection);

  d3.json("custom.geo.json")
    .then(function (json) {
      const mapContainer = d3.select("#map-container");
      const contRect = mapContainer.node().getBoundingClientRect();
      const svg = mapContainer
        .append("svg")
        .attr("width", contRect.width)
        .attr("height", maxHeight);

      const div = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

      //Bind data and create one path per GeoJSON feature
      const countriesGroup = svg.append("g").attr("id", "map");

      //Add Sphere
      countriesGroup
        .append("path")
        .attr("class", "sphere")
        .style("fill", "white")
        .attr("d", path({ type: "Sphere" }));

      countriesGroup
        .selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("stroke", "black")
        .attr("fill", getColourMap)
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
            .html(d.properties.name + "<br/>" + "Total Student Count : "+ totalStudent +"<br/>")
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

          const selectedCountry = getCountryStudentDataFromMap(d);
          buildLineChart(selectedCountry, modalDiv, event);
        });

      // set legend
      svg
        .append("g")
        .attr("class", "legendLimits")
        .attr("transform", "translate(" + w + 100 + " ,200)");

      // const legend = d3
      //   .legendColor()
      //   .labelFormat(d3.format(",.0f"))
      //   .labels(d3.legendHelpers.thresholdLabels)
      //   .labelOffset(3)
      //   .shapePadding(0)
      //   .scale(colorScale);

      // svg.select(".legendLimits").call(legend);


    })
    .catch(function (error) {
      console.log(error);
    });
}

function getColourMap(country){
          
    //****Apply blue colour scale according to the total students**
    const countryData = getCountryStudentDataFromMap(country);
    
    if (countryData) {
      totalStudent = countryData.total;
    } else {
      totalStudent = 0;
    }

    return colorScale(totalStudent);
  
}

function getCountryStudentDataFromMap(d) {
  const selectedCountry = [
    d.properties.name,
    d.properties.name_ciawf,
    d.properties.name_long,
    d.properties.formal_en,
    d.properties.name_en,
    d.properties.name_sort,
  ];

  for (let i = 0; i < selectedCountry.length; i++) {
    if (studentCount.has(selectedCountry[i])) {
      return studentCount.get(selectedCountry[i]);
    }
  }
}

function createModalDiv(event, d) {
  d3.select("#lineChart.modal").remove();

  var modalDiv = d3
    .select("body")
    .append("div")
    .attr("class", "modal")
    .attr("id", "lineChart")
    .style("position", "absolute")
    .style("width", modalWidth);
  //.attr("height", modalHeight);

  var modalHeader = modalDiv
    .append("div")
    .append("header")
    .attr("class", "modal-header")
    .attr("id", "modal-header");

  var closeButton = modalHeader
    .append("span")
    .attr("class", "modal-close")
    .on("click", function (event, d) {
      modalDiv.remove();
    });

  closeButton
    .append("img")
    .attr("src", "icons8-close-window-30.png")
    .attr("width", 23)
    .attr("height", 23)
    .on("mouseover", function (event, d) {
      d3.select(this).classed("modal-close-hover", true);
    })
    .on("mouseout", function (event, d) {
      d3.select(this).classed("modal-close-hover", false);
    });

  //Add modal header
  let modalHeading = modalHeader.append("h5").attr("class", "modal-h5");
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

  //Check whether the selected Country data is available
  if (selectedCountry) {
    // modalPositionX = event.pageX + modalWidth > w ? event.pageX - modalWidth : event.pageX
    // modalPositionY = event.pageY + modalHeight > h ? event.pageY - modalHeight : event.pageY
    modalPositionX = w / 2 - modalWidth / 2;
    modalPositionY = h / 2 - modalHeight / 2;

    //Get the data related to the selected Country
    // const countryData = studentCount.get(country);

    console.log("selectedCountry ", selectedCountry);
    selectedCountry.values.forEach(function (d) {
      console.log(d);
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
      // .domain([d3.min(yMax) - 100, d3.max(yMax)])
      .domain([0, d3.max(yMax)])
      .range([graphHeight, 0]);

    //****BUILD THE AXES****
    //format years as date
    const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d"));

    const yAxis = d3.axisLeft(yScale).ticks(12);

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
      .datum(selectedCountry.values)
      .attr("fill", "none")
      .attr("class","line")
      // .attr("stroke", colourScale)
      // .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            console.log("xscale ", d);
            return xScale(d.year);
          })
          .y(function (d) {
            return yScale(d.count);
          })
      )
      .on("mouseover", function (d) {
        d3.select(this).attr("stroke-width", 3);
      })
      .on("mouseout", function (d) {
        d3.select(this).attr("stroke-width", 1.5);
      });

    // add the dots with tooltips

    var lineDiv = d3
      .select("body")
      .append("div")
      .attr("class", "lineTooltip")
      .style("opacity", 0);

    const circle = graphGroup
      .selectAll("dot")
      .data(selectedCountry.values)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("cx", function (d) {
        return xScale(d.year);
      })
      .attr("cy", function (d) {
        return yScale(d.count);
      })
      .style("opacity", 0.4)
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 1);

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
          .html(
            selectedCountry.country +
              ": year " +
              d.year +
              "<br/>" +
              "Student count: " +
              d.count
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).style("opacity", 0.4);
        lineDiv.transition().duration(500).style("opacity", 0);
      });
  } else {
    modalDiv.append("div").append("h5").html("Data is not available");
    const modalDivRect = modalDiv.node().getBoundingClientRect();
    console.log("modal wIDTH" + modalWidth);
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
