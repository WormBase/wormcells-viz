import * as d3 from 'd3';

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
        .domain(colorscale.domain());

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
        .ticks(20)
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