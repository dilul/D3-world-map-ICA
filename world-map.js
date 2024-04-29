/********************************************************
 * World Map with Line Chart
 * Name and Index: Kananke Liyanage, Nalinika (D3220766)
 ********************************************************
*/
/*
  Country Geo json file generated using, https://geojson-maps.kyd.au/
  Inspiration sources:
  https://dev.to/sriramvsharma/drawing-a-world-map-in-13-lines-of-code-368a
  https://medium.com/@andybarefoot/making-a-map-using-d3-js-8aa3637304ee
  https://d3-graph-gallery.com/graph/line_basic.html
  https://d3-graph-gallery.com/graph/line_change_data.html
  
  Colour scheme source: https://github.com/d3/d3-scale-chromatic
*/

const maxWidth = window.innerWidth * 0.85 - 175;
const maxHeight = window.innerHeight * 0.9;
const ratio = 0.5;

let w = maxWidth;
let h = maxWidth * ratio;

if (h > maxHeight) {
  h = maxHeight;
  w = h / ratio;
}

//Modal window width and height
const modalWidth = w * 0.55;
const modalHeight = modalWidth * 0.8;

let modalPositionX = w / 2;
let modalPositionY = h / 2;

const studentData = new Map();
const colourScaleData = new Map();

//define the student count intervals
const colourDomain = [0, 100, 1000, 5000, 10000, 15000, 25000, 50000, 75000, 100000]
//define colour range for data intervals
const colourRange = ["#FFFFFF","#FFFFFF","#ffffcc",
  "#ffeda0",
  "#fed976",
  "#feb24c",
  "#fd8d3c",
  "#fc4e2a",
  "#e31a1c",
  "#bd0026",
  "#800026"]

const colorScale = d3
  .scaleThreshold()
  .domain(colourDomain)
  .range(colourRange);


/*===================================================
  Initiate the student data loading and map building
*====================================================
*/
populateStudentDataAndBuildMap();


/*===================================
  Populate student data
 ====================================
*/
function populateStudentDataAndBuildMap() {
  d3.json("international-student.json").then((dataSet) => {
    dataSet.forEach(function (record) {
      const colour = colorScale(record.total)
      const values = {...record, colour};
      const country = record.country;

      //Store student data in map (To load specific country data)
      studentData.set(country, values);

      //Store countries belong to same colour code (For interactive legend of the map)
      const colourCountries = colourScaleData.get(colour) || []
      colourScaleData.set(colour, [...colourCountries, getId(country)])
    });

    //Calling choropleth map building method
    buildChoroplethMap();
  });
}


/*===============================================
   This method build Choropleth Map
  ===============================================
*/
function buildChoroplethMap() {

  //Define projection style
  const projection = d3
    .geoEquirectangular()
    .center([0, 0])
    .scale([w / (2 * Math.PI)])
    .translate([w / 2, h / 2]);

  //geographic path generator
  const path = d3.geoPath().projection(projection);

  //Read country data from json file
  d3.json("custom.geo.json")
    .then(function (json) {
      const mapContainer = d3.select("#map-container");
      const contRect = mapContainer.node().getBoundingClientRect();

      //Append SVG to the map-container div 
      const svg = mapContainer
        .append("svg")
        .attr("width", contRect.width)
        .attr("height", maxHeight);

      
      const mapTooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

      //Bind data and create one path per GeoJSON feature
      const countriesGroup = svg.append("g").attr("id", "map");

      let selectedColourScale;

      //Add Sphere
      countriesGroup
        .append("path")
        .attr("class", "sphere")
        .style("fill", "white")
        .attr("d", path({type: "Sphere"}));

      //Draw the map
      countriesGroup
        .selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("stroke", "black")
        .style("opacity", 1)
        .attr("id", function (d) {

          const countryData = getCountryStudentDataFromMap(d);
          const countryName = getId(countryData?.country || d.properties.name);
          // if (!countryData) {
          //   const colour = colorScale('No data');
          //   const colourCountries = colourScaleData.get(colour) || [];
          //   colourScaleData.set(colour, [...colourCountries, countryName]);
          // }
          return "country" + countryName;
        })
        .attr("fill", function (d) {

          //Fill the country with colour scale
          const countryData = getCountryStudentDataFromMap(d);

          //Apply different colour to Canada
          // if (d.properties.name === 'Canada') {
          //   return "#8c0287"
          // }
          return countryData?.colour || colorScale('No data');
        })
        .on("mouseover", function (event, d) {
          const bbox = this.getBBox();

          /*
            Get student data related to the mouse pointed country 
          */
          const hoverCountry = getCountryStudentDataFromMap(d);
          const total = hoverCountry?.total || 0;

          //Change the hovered country colour
          d3.select(this).classed("hovernode", true);

          //Set tooltip size
          mapTooltip
            .transition()
            .duration(200)
            .attr("width", function (d) {
              return bbox.width + 4;
            })
            .attr("height", function (d) {
              return bbox.height;
            })
            .style("opacity", 0.9);

          //Set the tooltip text and the style
          mapTooltip
            .html(d.properties.name + "<br/>" + "Total Student Count : " + total + "<br/>")
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function (d) {

          //Change back the country node colour when mouse move out
          d3.select(this).classed("hovernode", false);
          mapTooltip.transition().duration(500).style("opacity", 0);
        })
        .on("click", function (event, d) {
          d3.select(this).classed("hovernode", false);
          d3.selectAll(".country").classed("country-on", false);

          //Create modal when click on a country
          const modalDiv = createModalDiv(event, d);

          //Get selected country related student data
          const selectedCountry = getCountryStudentDataFromMap(d);

          //Call line chart building method
          buildLineChart(selectedCountry, modalDiv, event);
        });


      /*===========================
      * Create interactive legend
      *============================
      */
      const legendGroup = svg
        .append("g")
        .attr("class", "legendGroup")
        .attr('width', 148)
        .attr('height', 148)
        .selectAll('g')
        .data(colorScale.domain().slice().reverse())
        .enter().append('g')
        .attr("transform", function (d, i) {
          return "translate(" + (w + 20) + "," + i * 20 + ")";
        });

      //create rectangles for each colour 
      legendGroup.append("rect")
        .attr('width', 40)
        .attr('height', 20)
        .attr('stroke', 'black')
        .attr('fill', colorScale)
        .attr('class', 'legend-box')
        .attr('id', function (d) {
          const id = getId(`legend${d}`)
          return id;
        })
        .on("click", function (event, d) {
          
          //get the opacity of the selected colour
          const opacity = selectedColourScale === d ? 1 : 0.2;
          const legendOpacity = selectedColourScale === d ? 1 : 0.4;
          const pointerEvent = selectedColourScale === d ? 'auto' : 'none';
          const allCountries = d3.selectAll(".country");

          //Get opacity style and pointer event for all countries 
          allCountries
            .style("opacity", opacity)
            .style("pointer-events", pointerEvent);

          const allLegends = d3.selectAll(".legend-box");
          allLegends.style("opacity", legendOpacity);

          if (selectedColourScale !== d) {
            selectedColourScale = d;
            const mappedCountries = colourScaleData.get(colorScale(d)) || [];
            for (const country of mappedCountries) {
              try {
                const selectCountry = d3.selectAll("#country" + country);
                if (selectCountry) {
                  selectCountry
                    .style("opacity", 1)
                    .style("pointer-events", 'auto');
                }
              } catch (e) {
                console.error(country, e)
              }
            }
            const id = getId(`legend${d}`)
            d3.select(`#${id}`).style("opacity", 1);
          } else {
            selectedColourScale = undefined;
          }

        });

      const colourDomainLength = colourDomain.length;
      //Set the legend text
      legendGroup.append("text")
        .attr("x", 50)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function (d, i) {
          if (i === colourDomainLength - 1) {
            // No data point
            return d;
          } else if (i === 0) {
            // upper limit
            return `${d} Upward`
          } else {
            // middle points
            const nextColourDomain = colourDomain[colourDomainLength - i] - 1 // getting next point and minus 1
            return `${d} - ${nextColourDomain}`
          }
        });

    })
    .catch(function (error) {
      console.log(error);
    });
}

function getId(rawId) {
  return rawId.replace(/\W+/g, '');
}

/*
  This method returns the country related data
*/
function getCountryStudentDataFromMap(d) {

  //selected country name is checked against various map data as there are name differences in both data files
  const selectedCountry = [
    d.properties.name,
    d.properties.name_ciawf,
    d.properties.name_long,
    d.properties.formal_en,
    d.properties.name_en,
    d.properties.name_sort,
  ];

  //get the student data from map
  for (let i = 0; i < selectedCountry.length; i++) {
    if (studentData.has(selectedCountry[i])) {
      return studentData.get(selectedCountry[i]);
    }
  }
}

/**
 * This method create the modal to display the line chart
 *
 */
function createModalDiv(event, d) {
  d3.select("#lineChart.modal").remove();

  //Append modal div container to body
  const modalDiv = d3
    .select("body")
    .append("div")
    .attr("class", "modal")
    .attr("id", "lineChart")
    .style("position", "absolute")
    .style("width", modalWidth);

  //Append a modal header
  const modalHeader = modalDiv
    .append("div")
    .append("header")
    .attr("class", "modal-header")
    .attr("id", "modal-header");

  //Append a span to header to include a close button for the modal
  const closeButton = modalHeader
    .append("span")
    .attr("class", "modal-close")
    .on("click", function (event, d) {
      modalDiv.remove();
    });

  //Append a close icon image to the span
  closeButton
    .append("img")
    .attr("src", "close.png")
    .attr("width", 23)
    .attr("height", 23)
    .on("mouseover", function (event, d) {
      d3.select(this).classed("modal-close-hover", true);
    })
    .on("mouseout", function (event, d) {
      d3.select(this).classed("modal-close-hover", false);
    });

  //Add modal header text
  const modalHeading = modalHeader.append("h5").attr("class", "modal-h5");
  modalHeading.text("International Students Trend of " + d.properties.name);

  //Set the modal position
  modalDiv
    .style("left", modalPositionX + "px")
    .style("top", modalPositionY + "px");

  return modalDiv;
}


/*==========================================================================
    The code blocks in the below are related to line chart

  ===========================================================================
*/

/*
  This method build the line chart axes
*/
function buildLineChartAxes(graphGroup, graphHeight, xScale, yScale) {

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

  const yAxis = axesGroup
    .append("g")
    .attr("id", "y-axis");
  yAxis.call(yAxisData)
    .selectAll("text")
    .attr("class", "label");

  return {xAxis, yAxis}
}

/*
  This method update the line chart axes when second line is drawn
*/
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

/**
 * This method draw the line in the line chart
 */
function buildLineChartLine(graphGroup, graphHeight, countryStudentValues, xScale, yScale, clazz) {

  const linePath = graphGroup
    .append("path")
    .datum(countryStudentValues)
    .attr("fill", "none")
    .attr("class", `${clazz}-line`)
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
    .on("mouseover", function () {
      d3.select(this).style("opacity", 4);
    })
    .on("mouseout", function () {
      d3.select(this).style("opacity", 0.6);
    });

  const pathLength = linePath.node().getTotalLength();

  linePath
    .attr("stroke-dashoffset", pathLength)
    .attr("stroke-dasharray", pathLength)
    .transition()
    .ease(d3.easeSin)
    .duration(1000)
    .attr("stroke-dashoffset", 0);

  return linePath;
}

function updateLineChartPath(lineChartPath, xScale, yScale, updatedData) {
  if (updatedData) {
    lineChartPath.datum(updatedData);
  }
  const duration = 1000
  lineChartPath
    .transition()
    .duration(duration)
    .attr("d", d3.line()
      .x(function (d) {
        return xScale(d.year);
      })
      .y(function (d) {
        return yScale(d.count);
      })
    );

  // path length changes due to the above transition for data point changes
  // therefore needed the following interval to check the length of the line and update it every millisecond

  let counter = 0;
  const i = setInterval(function () {
    const pathLength = lineChartPath.node().getTotalLength();
    lineChartPath.attr("stroke-dasharray", pathLength);

    counter++;
    if (counter === duration) {
      clearInterval(i);
    }
  }, 1)

}

/*
  This method create data points as dots in the line chart
*/
function createLineChartDots(graphGroup, lineDiv, graphHeight, countryStudentValues, xScale, yScale, country) {

  const dots = graphGroup
    .selectAll("dot")
    .data(countryStudentValues)
    .enter()
    .append("circle")
    .attr("r", 3)
    .attr("cx", function (d) {
      return xScale(d.year);
    })
    .attr("cy", function (d) {
      return yScale(d.count);
    })
    .style("opacity", 0)
    .on("mouseover", function (event, d) {

      //Change the opacity of the dot when mouse hover on the data point
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

      //Set the line chart tooltip text
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
    .duration(3000)
    .style("opacity", 0.4);

  return dots;
}

//Update line chart dots for the secondary line
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

//line chart x-scale
function getXScale(dataSetY, graphWidth) {
  return d3
    .scaleTime()
    .domain(d3.extent(dataSetY))
    .range([0, graphWidth]);
}

//line chart y-scale
function getYScale(yMax, graphHeight) {
  return d3
    .scaleLinear()
    .domain([0, d3.max(yMax)])
    .range([graphHeight, 0]);
}

/*
  Add values to country drop down
*/
function countryDropDown(dropdownContainer, countries) {

  //console.log(countries);
  //drop down value list
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

/**
 * This method get the dropdown action and update the values for second line creation
 *
 */
function dropdownOnChangeActions(dropdown, dataSetY, yMax, secondaryGraphGroup, modal, margin, xScale, graphWidth, yScale, graphHeight, secondaryLineChartPath, secondaryLineChartDots, lineTooltipDiv, axes, linePath, dots) {
  const selectedOption = dropdown.property("value")
  const secondaryDataSetY = [...dataSetY];
  const secondaryYMax = [...yMax];

  if (selectedOption !== "Select") {
    const secondSelectedCountryDetails = studentData.get(selectedOption);
    const secondSelectedCountry = secondSelectedCountryDetails.country
    const secondSelectedCountryStudentValues = secondSelectedCountryDetails.values

    if (!secondaryGraphGroup) {
      //append group for second line
      secondaryGraphGroup = buildLineChartGraphGroup(modal, margin, 'secondary');
    }

    //get data for the second country
    secondSelectedCountryStudentValues.forEach(function (d) {
      secondaryDataSetY.push(d.year);
      secondaryYMax.push(d.count);
    });

    //get x scale for second country data
    xScale = getXScale(secondaryDataSetY, graphWidth);

    //get y scale for second country data
    yScale = getYScale(secondaryYMax, graphHeight);

    //secondary line chart building for the initial state (no country selected from drop down)
    if (!secondaryLineChartPath) {
      secondaryLineChartPath = buildLineChartLine(secondaryGraphGroup, graphHeight, secondSelectedCountryStudentValues, xScale, yScale, 'secondary');
      secondaryLineChartDots = createLineChartDots(secondaryGraphGroup, lineTooltipDiv, graphHeight, secondSelectedCountryStudentValues, xScale, yScale, secondSelectedCountry);
    } else {

    //secondary line path update (when change country in the dropdown)
      updateLineChartPath(secondaryLineChartPath, xScale, yScale, secondSelectedCountryStudentValues);
      updateLineChartDots(secondaryLineChartDots, xScale, yScale, secondSelectedCountryStudentValues, lineTooltipDiv, secondSelectedCountry);
    }
  } else {
    
  //this code block runs when selected option is "select" change back to original state
    if (secondaryGraphGroup) {
      const duration = 500;
      secondaryGraphGroup
        .transition()
        .duration(duration)
        .style("opacity", 0)
        .remove();
      secondaryGraphGroup = undefined;
      if (secondaryLineChartPath) {
        const pathLength = secondaryLineChartPath.node().getTotalLength();
        secondaryLineChartPath
          .transition()
          .duration(duration)
          .attr("stroke-dashoffset", pathLength)
          .remove();
        secondaryLineChartPath = undefined;
        secondaryLineChartDots.transition().duration(duration).remove();
        secondaryLineChartDots = undefined;
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
    secondaryLineChartDots,
  };
}


/*========================================================
    This method create the line chart

  ========================================================
*/
function buildLineChart(selectedCountry, modalDiv, event) {

  //Check whether the selected Country data is available
  if (selectedCountry) {
    const dataSetY = [];
    const yMax = [];

    // set the dimensions and margins of the graph
    const margin = {top: 30, right: 30, bottom: 30, left: 80},
      graphWidth = modalWidth - margin.left - margin.right,
      graphHeight = modalHeight - margin.top - margin.bottom;

    modalPositionX = w / 2 - modalWidth / 2;
    modalPositionY = h / 2 - modalHeight / 2;

    const country = selectedCountry.country;
    const countryStudentValues = selectedCountry.values;
    const countries = [...studentData.keys()].filter(c => c !== country)

    countryStudentValues.forEach(function (d) {
      dataSetY.push(d.year);
      yMax.push(d.count);
    });

    //scale the data  
    let xScale = getXScale(dataSetY, graphWidth);

    //set min y value as zero
    let yScale = getYScale(yMax, graphHeight);

    //Create drop down container
    const dropdownContainer = modalDiv
      .append("div")
      .attr("class", "dropdown-container")
      .attr("id", "dropdown-container");

    //Append instruction text
    dropdownContainer.append("text")
      .style("font-size", 14).attr("class", "modalLabel").text("Please select a country to compare");

    //Append drop down with country names to the modal
    const dropdown = countryDropDown(dropdownContainer, countries);

    //Append SVG to the modal div tag
    const modalSVG = modalDiv
      .append("svg")
      .attr("class", "modal")
      .attr("id", "content")
      .attr("width", modalWidth)
      .attr("height", modalHeight)
      .style("z-index", "10");

    const primaryGraphGroup = buildLineChartGraphGroup(modalSVG, margin, 'primary');

    //build the axes
    const axes = buildLineChartAxes(primaryGraphGroup, graphHeight, xScale, yScale);

    modalDiv
      .transition()
      .duration(200)
      .style("opacity", 0.96)
      .style("visibility", "visible")
      .style("left", modalPositionX + "px")
      .style("top", modalPositionY + "px");

    //Build line chart tooltip div
    const lineTooltipDiv = d3
    .select("body")
    .append("div")
    .attr("class", "lineTooltip")
    .style("opacity", 0);

    //Build line in the line chart
    const linePath = buildLineChartLine(primaryGraphGroup, graphHeight, countryStudentValues, xScale, yScale, 'primary');

    // add the dots with tooltips
    const dots = createLineChartDots(primaryGraphGroup, lineTooltipDiv, graphHeight, countryStudentValues, xScale, yScale, country);

    let secondaryGraphGroup;
    let secondaryLineChartPath;
    let secondaryLineChartDots;

    //dropdown change
    dropdown.on("change", function () {
      const res = dropdownOnChangeActions(dropdown, dataSetY, yMax, secondaryGraphGroup, modalSVG, margin, xScale, graphWidth, yScale, graphHeight, secondaryLineChartPath, secondaryLineChartDots, lineTooltipDiv, axes, linePath, dots);
      xScale = res.xScale;
      yScale = res.yScale;
      secondaryGraphGroup = res.secondaryGraphGroup;
      secondaryLineChartPath = res.secondaryLineChartPath;
      secondaryLineChartDots = res.secondaryLineChartDots;
    });

  } else {

    /**
     * This code block will run when selected country has no student data.
     */
    modalDiv.append("div").append("h5").html("Data is not available");
    const modalDivRect = modalDiv.node().getBoundingClientRect();

    modalPositionX = w / 2 - modalDivRect.width / 2;
    modalPositionY = h / 2 - modalDivRect.height / 2;
  }

  modalPositionX = modalPositionX < 0 ? 10 : modalPositionX;
  modalPositionY = modalPositionY < 0 ? 10 : modalPositionY;
}

/*
    This function was used to create the student json file
*/
// function convertDataset(dataset) {
//   const dataMap = d3.map(dataSet, (value) => {
//     const data = {country: value.Country, values: []};
//     let total = 0;
//     for (let index = 2015; index <= 2023; index++) {
//       const count = value[index];
//       const val = {year: index, count};
//       total += count
//       data.values.push(val);
//     }
//     data.total = total;
//     return data;
//   });
//   console.log(JSON.stringify(dataMap));
// }
