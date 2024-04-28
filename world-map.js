const maxWidth = window.innerWidth * 0.8 - 75;
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
const colourScaleData = new Map();
const colourDomain = ['No data', 0, 100, 1000, 4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000, 40000, 44000, 48000, 52000, 56000, 60000, 64000]
const colourRange = [
  "#000",
  "#000",
  "#fff",
  "#fff5eb",
  "#fee8d3",
  "#fdd8b3",
  "#fdc28c",
  "#fda762",
  "#fb8d3d",
  "#f2701d",
  "#e25609",
  "#c44103",
  "#9f3303",
  "#892303",
  "#7f1303",
  "#690303",
  "#5f3303",
  "#493303",
  "#3f3303",
  "#293303",
  "#1f3303",
  "#093303"
]

const colorScale = d3
  .scaleThreshold()
  // .domain([12])
  //.domain([0, 100, 1000, 4000, 8000, 12000, 16000, 20000, 24000]).range(d3.schemeOranges[9]);
  // .domain(colourMap.keys()).range(colourMap.values());
  .domain(colourDomain)
  .range(colourRange);
// .domain([0, 100, 1000, 4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000])
// .range(["#ffff","#fff5eb","#fee8d3","#fdd8b3","#fdc28c","#fda762","#fb8d3d","#f2701d","#e25609","#c44103","#9f3303","#7f2704"]);


populateStudentDataAndBuildMap();


/*===================================
  Populate student data
 ====================================
*/
function populateStudentDataAndBuildMap() {
  d3.json("international-student.json").then((dataSet) => {
    dataSet.forEach(function (dataSet) {
      const total = dataSet.values
        .map((val) => val.count)
        .reduce((a, b) => a + b);
      const colour = colorScale(total || 0)
      const values = {...dataSet, total, colour};
      const country = dataSet.country;
      studentData.set(country, values);

      const colourCountries = colourScaleData.get(colour) || []
      colourScaleData.set(colour, [...colourCountries, getId(country)])
    });
    console.log(studentData);
    console.log(colourScaleData);
    buildChoroplethMap();
  });
}

// var projection = d3.geoMercator()
// .center([0, 5 ])
// .scale(150)
// .rotate([-180,0]);

/*===============================================
   This method build Choropleth Map
  ===============================================
*/
function buildChoroplethMap() {

  const projection = d3
    .geoEquirectangular()
    .center([0, 0])
    .scale([w / (2 * Math.PI)])
    .translate([w / 2, h / 2]);

  const path = d3.geoPath().projection(projection);

  //Read country data from json file
  d3.json("custom.geo.json")
    .then(function (json) {
      const mapContainer = d3.select("#map-container");
      const contRect = mapContainer.node().getBoundingClientRect();
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

      countriesGroup
        .selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("stroke", "black")
        .attr("fill", function (d) {
          const countryData = getCountryStudentDataFromMap(d);
          if (d.properties.name === 'Canada') {
            return "#f44"
          }
          return countryData?.colour || 0;
        })
        //.attr("class",function(d){ return "Country" })
        .style("opacity", 0.8)
        .attr("id", function (d) {
          // console.log(d.properties.iso_a3)
          // console.log(d.properties.name)

          const countryData = getCountryStudentDataFromMap(d);
          const countryName = getId(countryData?.country || d.properties.name);
          if (!countryData) {
            const colour = colorScale('No data')
            const colourCountries = colourScaleData.get(colour) || []
            colourScaleData.set(colour, [...colourCountries, countryName])
          }
          return "country" + countryName;
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

          // var zoom = d3.zoom()
          // .scaleExtent([1, 8])
          // .on('zoom', function (event) {
          //   mapContainer.selectAll('path')
          //     .attr('transform', event.transform);
          // });

          // mapContainer.call(zoom);
        });

      // set legend
      const legendGroup = svg
        .append("g")
        .attr("class", "legendGroup")
        .attr('width', 148)
        //and 148px high
        .attr('height', 148)
        //then either select all the 'g's inside the svg
        //or create placeholders
        .selectAll('g')
        //Fill the data into our placeholders in reverse order
        //This arranges our legend in descending order.
        //The 'data' here is the items we entered in the 'domain',
        //in this case [min, max]
        //We use 'slice()' to create a shallow copy of the array
        //Since we don't want to modify the original one
        .data(colorScale.domain().slice().reverse())
        //Every node in teh data should have a 'g' appended
        .enter().append('g')
        // "translate(" + w + 100 + " ,200)"
        .attr("transform", function (d, i) {
          return "translate(" + (w + 20) + "," + i * 20 + ")";
        });

      const legend = legendGroup.append("rect")
        // .datum(json.features)
        // .attr('x', function(d,i) { return d*i; })
        //.attr('y', 120)
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
          const opacity = selectedColourScale === d ? 0.8 : 0.2;
          const legendOpacity = selectedColourScale === d ? 1 : 0.4;
          const pointerEvent = selectedColourScale === d ? 'auto' : 'none';
          // const boarderWidth = selectedColourScale === d ? 'thin' : 'thick';
          const allCountries = d3.selectAll(".country");

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

      //           .selectAll('circle')
      //           .data(studentData)
      //           .enter()
      //           .append('circle')
      //               .attr("cy", function(d, i) {return i*20})
      //               .attr("r", 5)
      //               .style("fill", getColourMap);

      // const legendText  = legendGroup
      //                 .selectAll('text')
      //                 .data(studentData)
      //                 .enter()
      //                 .append("text")  
      //                     .attr("x", 30) 
      //                     .attr("y", function(d, i) {return i*20})               
      //                     .attr("dy", ".35em") // 1em is the font size so 0.35em is 35% of the font size. This attribute offsets the y position by this amount.
      //                     .attr("text-anchor", "start")
      //                     .style("fill", getColourMap)
      //                     .text(function(d){return d});
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

function getId(rawId) {
  return rawId.replace(/\W+/g, '');
}

/**
 * This method returns the colour scale for the map according to the total students
 *
 */
// function getColourMap(country) {
//   //****Apply red colour scale according to the total students**
//   const countryData = getCountryStudentDataFromMap(country);
//   // console.log(countryData?.country);
//   // if( countryData.country=="Canada"){
//   //   return "#0000";
//   // }
//   const colour = colorScale(countryData?.total || 0);
//
//   colourScaleData.set(countryData?.country, colour);
//   return colour;
//
// }

/*
  This method returns the country related data
*/
function getCountryStudentDataFromMap(d) {

  //selected country name is check against various map data as there are name differences in both data files
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
  //.attr("height", modalHeight);

  //Append a modal header
  const modalHeader = modalDiv
    .append("div")
    .append("header")
    .attr("class", "modal-header")
    .attr("id", "modal-header");

  //Append a span to include a close button for the modal
  const closeButton = modalHeader
    .append("span")
    .attr("class", "modal-close")
    .on("click", function (event, d) {
      modalDiv.remove();
    });

  //Append a close icon image to the span
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

  //Add modal header text
  const modalHeading = modalHeader.append("h5").attr("class", "modal-h5");
  modalHeading.text("International Students Trend of " + d.properties.name);

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
    // .attr("stroke", colourScale)
    // .attr("stroke-width", 1.5)
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
    // .style("opacity", 0)
    .on("mouseover", function () {
      d3.select(this).attr("stroke-width", 3);
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke-width", 1.5);
    });

  // const transitionPath = d3
  // .transition()
  // .ease(d3.easeSin)
  // .duration(2500);

  // linePath.transition(transitionPath).attr("stroke-dashoffset", 0);
  // linePath
  //   .transition()
  //   .ease(d3.easeSin)
  //   .duration(2500)
  //   // .style("opacity", 1)
  //   .attr(
  //     "d",
  //     d3
  //       .line()
  //       .x(function (d) {
  //         return xScale(d.year);
  //       })
  //       .y(function (d) {
  //         return yScale(d.count);
  //       })
  //   )

  const pathLength = linePath.node().getTotalLength();

  linePath
    .attr("stroke-dashoffset", pathLength)
    .attr("stroke-dasharray", pathLength)
    .transition()
    .ease(d3.easeSin)
    .duration(1000)
    .attr("stroke-dashoffset", 0);

//build line according to data values and add transition for line
  // linePath
  //   .transition()
  //   .duration(1000)
  //   .ease(d3.easeCubicInOut)
  //   .attr(
  //     "d",
  //     d3
  //       .line()
  //       .x(function (d) {
  //         return xScale(d.year);
  //       })
  //       .y(function (d) {
  //         return yScale(d.count);
  //       })
  //   )

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

function buildLineChartTooltipDiv() {
  return d3
    .select("body")
    .append("div")
    .attr("class", "lineTooltip")
    .style("opacity", 0);
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
    // .attr("cx", function (d) {
    //   return 0;
    // })
    // .attr("cy", function () {
    //   return graphHeight;
    // })
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
 * This method get the drop down action and update the values for second line creation
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
      secondaryLineChartDots = createLineChartDots(secondaryGraphGroup, lineTooltipDiv, graphHeight, secondSelectedCountryStudentValues, xScale, yScale, secondSelectedCountry);
    } else {
      updateLineChartPath(secondaryLineChartPath, xScale, yScale, secondSelectedCountryStudentValues);
      updateLineChartDots(secondaryLineChartDots, xScale, yScale, secondSelectedCountryStudentValues, lineTooltipDiv, secondSelectedCountry);
    }
  } else {
    if (secondaryGraphGroup) {
      const duration = 500
      secondaryGraphGroup
        .transition()
        .duration(duration)
        .style("opacity", 0)
        .remove();
      secondaryGraphGroup = undefined
      if (secondaryLineChartPath) {
        const pathLength = secondaryLineChartPath.node().getTotalLength();
        secondaryLineChartPath
          .transition()
          .duration(duration)
          .attr("stroke-dashoffset", pathLength)
          .remove()
        secondaryLineChartPath = undefined
        secondaryLineChartDots
          .transition()
          .duration(duration)
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

    //Build line chart tooltip div
    const lineTooltipDiv = buildLineChartTooltipDiv();

    //Build line in the line chart
    const linePath = buildLineChartLine(primaryGraphGroup, graphHeight, countryStudentValues, xScale, yScale, 'primary');

    // add the dots with tooltips
    const dots = createLineChartDots(primaryGraphGroup, lineTooltipDiv, graphHeight, countryStudentValues, xScale, yScale, country);


    let secondaryGraphGroup;
    let secondaryLineChartPath;
    let secondaryLineChartDots;

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
//     for (let index = 2015; index <= 2023; index++) {
//       const val = {year: index, count: value[index]};
//       data.values.push(val);
//     }
//     return data;
//   });
//   console.log(JSON.stringify(dataMap));
// }
