import * as d3 from 'd3';
import * as d3ScaleChromatic from 'd3-scale-chromatic';

export function clearLegend(selector_id) {
    d3.select(selector_id).html("");
}

export function drawHeatmapLegend(selector_id, colorscale, minValue, maxValue, height = 200, width = 20, top = 10, right = 20, bottom = 0, left = 2) {
    d3.select(selector_id).html("");

    var margin = {top: top, right: right, bottom: bottom, left: left};

    var canvas = d3.select(selector_id)
        .style("height", height + "px")
        .style("width", width + "px")
        .style("position", "relative")
        .append("canvas")
        .attr("height", 1)
        .attr("width", width - margin.left - margin.right)
        .style("height", (height - margin.top - margin.bottom) + "px")
        .style("width", (width - margin.left - margin.right) + "px")
        .style("border", "1px solid #000")
        .style("position", "absolute")
        .style("top", (margin.top) + "px")
        .style("left", (margin.left) + "px")
        .node();

    var ctx = canvas.getContext("2d");

    var legendscale = d3.scaleLinear()
        .range([1, width - margin.left - margin.right])
        .domain([minValue, maxValue]);

    // image data hackery based on http://bl.ocks.org/mbostock/048d21cf747371b11884f75ad896e5a5
    var image = ctx.createImageData(width, 1);
    d3.range(width).forEach(function(i) {
        var c = d3.rgb(colorscale(legendscale.invert(i)));
        image.data[4*i] = c.r;
        image.data[4*i + 1] = c.g;
        image.data[4*i + 2] = c.b;
        image.data[4*i + 3] = 255;
    });
    ctx.putImageData(image, 0, 0);

    // d3.range(width).forEach(function(i) {
    //   ctx.fillStyle = colorscale(legendscale.invert(i));
    //   ctx.fillRect(i,0,1,height);
    // });

    var legendaxis = d3.axisBottom()
        .scale(legendscale)
        .tickSize(6)
        .ticks(5)
        .tickFormat(d3.format(".1e"));

    var svg = d3.select(selector_id)
        .append("svg")
        .attr("height", (height) + "px")
        .attr("width", (width) + "px")
        .style("position", "absolute")
        .style("left", "0px")
        .style("top", "0px")

    svg
        .append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (margin.left) + "," + (height - margin.bottom) + ")")
        .call(legendaxis);
}

export function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", -3).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            if (word !== '') {
                line.push(word);
                tspan.text(line.join(" "));
                if (line.length > 1 && line.map(word => word.length).reduce((a, i) => a + i, 0) > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", -3).attr("y", y).attr("dy", lineHeight + dy + "em").text(word);
                }
            }
        }
    });
}

export class Histograms {
    constructor(divId = "#histograms", top = 60, right = 30, bottom = 20,
                left = 110, width, height, xdomain = [-10, 100], ydomain = [0, 1],
                maxLabelLength = 1000) {
        this.divId = divId;
        if (!this.divId.startsWith("#")) {
            this.divId = "#" + this.divId;
        }
        this.margin = {top: top, right: right, bottom: bottom, left: left};
        this.height = height - this.margin.top - this.margin.bottom;
        this.width = width - this.margin.left - this.margin.right;
        this.xdomain = xdomain;
        this.ydomain = ydomain;
        this.maxLabelLength = maxLabelLength;
        d3.select(this.divId).html("");
        // Get the different categories and count them


        // append the svg object to the body of the page
        this.svg = d3.select(this.divId)
            .append("svg")
            .attr("width", width + this.margin.left + this.margin.right)
            .attr("height", height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + this.margin.left + "," + this.margin.top + ")");
    }

    draw(data) {

        var width = this.width;
        var height = this.height;
        var svg = this.svg;
        var xdomain = this.xdomain;
        var ydomain = this.ydomain;
        var maxLabelLength = this.maxLabelLength;
        var margin = this.margin;

        var categories = [...new Set(data.map(d => d.c))];
        var n = categories.length

        // Add X axis
        var x = d3.scaleLinear()
            .domain(xdomain)
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x)
                .ticks(10)
                .tickFormat(t => "1e" + (-10 + 0.1 * t)));

        svg.append("g")
            .attr("transform", "translate(0,-" + (margin.top - 20) + ")")
            .call(d3.axisTop(x)
                .ticks(10)
                .tickFormat(t => "1e" + (-10 + 0.1 * t)));

        // Create a Y scale for densities
        var y = d3.scaleLinear()
            .domain(ydomain)
            .range([height, 0]);

        // Create the Y axis for names
        var yName = d3.scaleBand()
            .domain(categories)
            .range([0, height])
            .paddingInner(1)
        svg.append("g")
            .call(d3.axisLeft(yName).tickSize(-width))
            .selectAll(".tick text")
            .call(wrap, maxLabelLength);

        // // set the parameters for the histogram
        // var histogram = d3.histogram()
        //     .value(function (d) {
        //         return d.price;
        //     })   // I need to give the vector of value
        //     .domain([0, 1000])  // then the domain of the graphic
        //     .thresholds(100); // then the numbers of bins
        //
        // // And apply this function to data to get the bins
        // var bins = histogram(data);

        // append the bar rectangles to the this.svg element
        var lineHeight = (height) / n

        var tooltip = d3.select(this.divId)
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")

        var mouseover = function (d) {
            d3.select(this)
                .style("stroke", "#02a169")
                .style("stroke-width", 2)
                .style("opacity", 1)
            tooltip
                .html(d.tooltip_html)
                .style("position", "absolute")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 100) + "px")
                .style("opacity", 1)
        }
        var mouseleave = function (d) {
            d3.select(this)
                .style("stroke", "gray")
                .style("stroke-width", 1)
            tooltip
                .html("")
                .style("opacity", 0)
        }

        svg.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", 1)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + (yName(d.c) - d.y * lineHeight) + ")";
            })
            .attr("width", function (d) {
                return width / (xdomain[1] - xdomain[0]) - 2;
            })
            .attr("height", function (d) {
                return d.y * lineHeight;
            })
            .attr("fill", function (d) {
                return d3ScaleChromatic.interpolateSinebow(d.color / n)
            })
            .style("stroke", "gray")
            .style("stroke-width", 1)
            .on("mouseover", mouseover)
            .on("mouseleave", mouseleave)

    }

}