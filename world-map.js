const maxWidth = window.innerWidth * 0.9;
const maxHeight = window.innerHeight * 0.9;
const ratio = 0.5;

let w = maxWidth;
let h = maxWidth * ratio;

if (h > maxHeight) {
  h = maxHeight;
  w = h / ratio;
}

const modalWidth = w * 0.55;
const modalHeight = modalWidth * 0.8;

let modalPositionX = w / 2;
let modalPositionY = h / 2;

const studentData = new Map();

const colorScale = d3
  .scaleThreshold()
  .domain([0, 100, 1000, 4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000])
  .range(d3.schemeOranges[9]);


populateStudentDataAndBuildMap();


function populateStudentDataAndBuildMap() {
  d3.json("international-student.json").then((dataSet) => {
    dataSet.forEach(function (dataSet) {
      const total = dataSet.values
        .map((val) => val.count)
        .reduce((a, b) => a + b);
      const values = {...dataSet, total};
      studentData.set(dataSet.country, values);
    });
    console.log(studentData);
    buildChoreplethMap();
  });
}

// var projection = d3.geoMercator()
// .center([0, 5 ])
// .scale(150)
// .rotate([-180,0]);

function buildChoreplethMap() {

  const projection = d3
    .geoEquirectangular()
    .center([0, 0])
    .scale([w / (2 * Math.PI)])
    .translate([w / 2, h / 2]);

  const path = d3.geoPath().projection(projection);

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
        .attr("d", path({type: "Sphere"}));

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
          const bbox = this.getBBox();

          const hoverCountry = getCountryStudentDataFromMap(d);
          const total = hoverCountry?.total || 0;

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
            .html(d.properties.name + "<br/>" + "Total Student Count : " + total + "<br/>")
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

function getColourMap(country) {
  //****Apply red colour scale according to the total students**
  const countryData = getCountryStudentDataFromMap(country);

  return colorScale(countryData?.total || 0);

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
    if (studentData.has(selectedCountry[i])) {
      return studentData.get(selectedCountry[i]);
    }
  }
}

function createModalDiv(event, d) {
  d3.select("#lineChart.modal").remove();

  const modalDiv = d3
    .select("body")
    .append("div")
    .attr("class", "modal")
    .attr("id", "lineChart")
    .style("position", "absolute")
    .style("width", modalWidth);
  //.attr("height", modalHeight);

  const modalHeader = modalDiv
    .append("div")
    .append("header")
    .attr("class", "modal-header")
    .attr("id", "modal-header");

  const closeButton = modalHeader
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
  const modalHeading = modalHeader.append("h5").attr("class", "modal-h5");
  modalHeading.text("International Students Trend of " + d.properties.name);

  modalDiv
    .style("left", modalPositionX + "px")
    .style("top", modalPositionY + "px");

  return modalDiv;
}

function buildLineChartAxes(graphGroup, graphHeight, xScale, yScale) {

  //format years as date
  const xAxisData = d3.axisBottom(xScale).ticks(10).tickFormat(d3.format("d"));

  const yAxisData = d3.axisLeft(yScale).ticks(12);

  const axesGroup = graphGroup.append("g").attr("id", "axes-group");

  const xAxis = axesGroup
    .append("g")
    .attr("id", "x-axis")
    .attr("class", "axes")
    .attr("transform", `translate(${0}, ${graphHeight})`);
  xAxis.call(xAxisData)
    .attr("class", "label");
  // .selectAll("text")
  // .style("text-anchor", "end")
  // .attr("dx", "-1em")
  // .attr("dy", "-0.5em")
  // .attr("transform", "rotate(-90)");

  const yAxis = axesGroup
    .append("g")
    .attr("id", "y-axis");
  yAxis.call(yAxisData)
    .selectAll("text")
    .attr("class", "label");

  return {xAxis, yAxis}
}

function updateLineChartAxes(axes, graphHeight, xScale, yScale) {
  const yAxisData = d3.axisLeft(yScale).ticks(12);

  axes.yAxis
    .transition()
    .duration(1000)
    .call(yAxisData);
}

function buildLineChartGraphGroup(modal, margin, id) {
  return modal
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .attr("id", `graph-group-${id}`);
}

function buildLineChartLine(graphGroup, graphHeight, countryStudentValues, xScale, yScale, clazz) {
  const linePath = graphGroup
    .append("path")
    .datum(countryStudentValues)
    .attr("fill", "none")
    .attr("class", `${clazz}-line`)
    // .attr("stroke", colourScale)
    // .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line()
        .x(function (d) {
          return xScale(d.year);
        })
        .y(function () {
          return graphHeight;
        })
    )
    .style("opacity", 0)
    .on("mouseover", function () {
      d3.select(this).attr("stroke-width", 3);
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke-width", 1.5);
    });


  linePath
    .transition()
    .duration(1000)
    .style("opacity", 1)
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
    )

  return linePath;
}

function updateLineChartPath(lineChartPath, xScale, yScale, updatedData) {
  if (updatedData) {
    lineChartPath.datum(updatedData);
  }
  lineChartPath
    .transition()
    .duration(1000)
    .attr("d", d3.line()
      .x(function (d) {
        return xScale(d.year);
      })
      .y(function (d) {
        return yScale(d.count);
      })
    );
}

function buildLineChartTootipDiv() {
  return d3
    .select("body")
    .append("div")
    .attr("class", "lineTooltip")
    .style("opacity", 0);
}

function buildLineChartDots(graphGroup, lineDiv, graphHeight, countryStudentValues, xScale, yScale, country) {
  const dots = graphGroup
    .selectAll("dot")
    .data(countryStudentValues)
    .enter()
    .append("circle")
    .attr("r", 5)
    .attr("cx", function (d) {
      return xScale(d.year);
    })
    .attr("cy", function () {
      return graphHeight;
    })
    .style("opacity", 0)
    .on("mouseover", function (event, d) {
      d3.select(this).style("opacity", 1);

      const bbox = this.getBBox;
      lineDiv
        .transition()
        .duration(200)
        .attr("width", function () {
          return bbox.width + 4;
        })
        .attr("height", function () {
          return bbox.height;
        })
        .style("opacity", 0.9);

      lineDiv
        .html(`<b> ${country} </b><br/> year: ${d.year} <br/> Student count: ${d.count}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).style("opacity", 0.4);
      lineDiv.transition().duration(500).style("opacity", 0);
    });

  dots
    .transition()
    .duration(1000)
    .style("opacity", 0.4)
    .attr("cx", function (d) {
      return xScale(d.year);
    })
    .attr("cy", function (d) {
      return yScale(d.count);
    })

  return dots;
}

function updateLineChartDots(dots, xScale, yScale, updatedData, lineDiv, country) {
  if (updatedData) {
    dots
      .data(updatedData)
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 1);

        const bbox = this.getBBox;
        lineDiv
          .transition()
          .duration(200)
          .attr("width", function () {
            return bbox.width + 4;
          })
          .attr("height", function () {
            return bbox.height;
          })
          .style("opacity", 0.9);

        lineDiv
          .html(`<b> ${country} </b><br/> year: ${d.year} <br/> Student count: ${d.count}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      });
  }
  dots
    .transition()
    .duration(1000)
    .attr("cx", function (d) {
      return xScale(d.year);
    })
    .attr("cy", function (d) {
      return yScale(d.count);
    });
}

function getXScale(dataSetY, graphWidth) {
  return d3
    .scaleTime()
    .domain(d3.extent(dataSetY))
    .range([0, graphWidth]);
}

function getYScale(yMax, graphHeight) {
  return d3
    .scaleLinear()
    // .domain([d3.min(yMax) - 100, d3.max(yMax)])
    .domain([0, d3.max(yMax)])
    .range([graphHeight, 0]);
}

function countryDropDown(dropdownContainer, countries) {

  //console.log(countries);
  const data = ["Select", ...countries]

  const dropDown = dropdownContainer
    .append("select")
    .attr("class", "selection")
    .attr("name", "country-list");
  const options = dropDown.selectAll("option")
    .data(data)
    .enter()
    .append("option");
  options.text(function (d) {
    return d;
  });
  options.attr("value", function (d) {
    return d;
  });
  return dropDown;
}

function dropdownOnChangeActions(dropdown, dataSetY, yMax, secondaryGraphGroup, modal, margin, xScale, graphWidth, yScale, graphHeight, secondaryLineChartPath, secondaryLineChartDots, lineTooltipDiv, axes, linePath, dots) {
  const selectedOption = dropdown.property("value")
  const secondaryDataSetY = [...dataSetY];
  const secondaryYMax = [...yMax];

  if (selectedOption !== "Select") {
    const secondSelectedCountryDetails = studentData.get(selectedOption);
    const secondSelectedCountry = secondSelectedCountryDetails.country
    const secondSelectedCountryStudentValues = secondSelectedCountryDetails.values

    if (!secondaryGraphGroup) {
      secondaryGraphGroup = buildLineChartGraphGroup(modal, margin, 'secondary');
    }

    secondSelectedCountryStudentValues.forEach(function (d) {
      secondaryDataSetY.push(d.year);
      secondaryYMax.push(d.count);
    });

    xScale = getXScale(secondaryDataSetY, graphWidth);
    yScale = getYScale(secondaryYMax, graphHeight);
    if (!secondaryLineChartPath) {
      secondaryLineChartPath = buildLineChartLine(secondaryGraphGroup, graphHeight, secondSelectedCountryStudentValues, xScale, yScale, 'secondary');
      secondaryLineChartDots = buildLineChartDots(secondaryGraphGroup, lineTooltipDiv, graphHeight, secondSelectedCountryStudentValues, xScale, yScale, secondSelectedCountry);
    } else {
      updateLineChartPath(secondaryLineChartPath, xScale, yScale, secondSelectedCountryStudentValues);
      updateLineChartDots(secondaryLineChartDots, xScale, yScale, secondSelectedCountryStudentValues, lineTooltipDiv, secondSelectedCountry);
    }
  } else {
    if (secondaryGraphGroup) {
      secondaryGraphGroup
        .transition()
        .duration(500)
        .style("opacity", 0)
        .remove();
      secondaryGraphGroup = undefined
      if (secondaryLineChartPath) {
        secondaryLineChartPath
          .transition()
          .duration(500)
          .remove()
        secondaryLineChartPath = undefined
        secondaryLineChartDots
          .transition()
          .duration(500)
          .remove()
        secondaryLineChartDots = undefined
      }
    }

    xScale = getXScale(secondaryDataSetY, graphWidth);
    yScale = getYScale(secondaryYMax, graphHeight);
  }

  updateLineChartAxes(axes, graphHeight, xScale, yScale);
  updateLineChartPath(linePath, xScale, yScale);
  updateLineChartDots(dots, xScale, yScale);
  return {
    xScale,
    yScale,
    secondaryGraphGroup,
    secondaryLineChartPath,
    secondaryLineChartDots
  };
}

function buildLineChart(selectedCountry, modalDiv, event) {

  //Check whether the selected Country data is available
  if (selectedCountry) {
    const dataSetY = [];
    const yMax = [];

    // set the dimensions and margins of the graph
    const margin = {top: 30, right: 30, bottom: 30, left: 80},
      graphWidth = modalWidth - margin.left - margin.right,
      graphHeight = modalHeight - margin.top - margin.bottom;

    // modalPositionX = event.pageX + modalWidth > w ? event.pageX - modalWidth : event.pageX
    // modalPositionY = event.pageY + modalHeight > h ? event.pageY - modalHeight : event.pageY
    modalPositionX = w / 2 - modalWidth / 2;
    modalPositionY = h / 2 - modalHeight / 2;

    const country = selectedCountry.country;
    const countryStudentValues = selectedCountry.values;
    const countries = [...studentData.keys()].filter(c => c !== country)

    countryStudentValues.forEach(function (d) {
      dataSetY.push(d.year);
      yMax.push(d.count);
    });

    //****SCALE THE DATA****
    let xScale = getXScale(dataSetY, graphWidth);
    //set min y value as zero
    let yScale = getYScale(yMax, graphHeight);

    const dropdownContainer = modalDiv
      .append("div")
      .attr("id", "dropdown-container")

    const dropdown = countryDropDown(dropdownContainer, countries)

    const modal = modalDiv
      .append("svg")
      .attr("class", "modal")
      .attr("id", "content")
      .attr("width", modalWidth)
      .attr("height", modalHeight)
      .style("z-index", "10");

    const primaryGraphGroup = buildLineChartGraphGroup(modal, margin, 'primary');

    //****BUILD THE AXES****
    const axes = buildLineChartAxes(primaryGraphGroup, graphHeight, xScale, yScale);

    const colourScale = d3.scaleOrdinal(d3.schemeCategory10);

    modalDiv
      .transition()
      .duration(200)
      .style("opacity", 0.96)
      .style("visibility", "visible")
      .style("left", modalPositionX + "px")
      .style("top", modalPositionY + "px");

    const lineTooltipDiv = buildLineChartTootipDiv();

    const linePath = buildLineChartLine(primaryGraphGroup, graphHeight, countryStudentValues, xScale, yScale, 'primary');

    // add the dots with tooltips
    const dots = buildLineChartDots(primaryGraphGroup, lineTooltipDiv, graphHeight, countryStudentValues, xScale, yScale, country);


    let secondaryGraphGroup;
    let secondaryLineChartPath;
    let secondaryLineChartDots;

    dropdown.on("change", function () {
      const res = dropdownOnChangeActions(dropdown, dataSetY, yMax, secondaryGraphGroup, modal, margin, xScale, graphWidth, yScale, graphHeight, secondaryLineChartPath, secondaryLineChartDots, lineTooltipDiv, axes, linePath, dots);
      xScale = res.xScale;
      yScale = res.yScale;
      secondaryGraphGroup = res.secondaryGraphGroup;
      secondaryLineChartPath = res.secondaryLineChartPath;
      secondaryLineChartDots = res.secondaryLineChartDots;
    });

  } else {
    modalDiv.append("div").append("h5").html("Data is not available");
    const modalDivRect = modalDiv.node().getBoundingClientRect();

    modalPositionX = w / 2 - modalDivRect.width / 2;
    modalPositionY = h / 2 - modalDivRect.height / 2;
  }

  modalPositionX = modalPositionX < 0 ? 10 : modalPositionX;
  modalPositionY = modalPositionY < 0 ? 10 : modalPositionY;
}

function convertDataset(dataset) {
  const dataMap = d3.map(dataSet, (value) => {
    const data = {country: value.Country, values: []};
    for (let index = 2015; index <= 2023; index++) {
      const val = {year: index, count: value[index]};
      data.values.push(val);
    }
    return data;
  });
  console.log(JSON.stringify(dataMap));
}
