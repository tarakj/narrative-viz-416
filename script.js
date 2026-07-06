/* =====================================================================
 * What Drives Fuel Economy? — a martini-glass narrative visualization
 * of the 2017 automobile fuel-economy dataset.
 *
 * PARAMETERS (state variables):
 *   state.scene         — index of the current scene (0..3)
 *   state.visibleFuels  — set of fuel types shown (used in scene 3)
 *   state.cylinderFilter— engine-cylinder filter ("all" or a number)
 *
 * TRIGGERS:
 *   Next/Back buttons, progress dots and arrow keys change state.scene.
 *   Fuel-type toggle buttons and the cylinder dropdown (scene 3 only)
 *   change visibleFuels / cylinderFilter. Every trigger calls render().
 * ===================================================================== */

"use strict";

// ---------- configuration ----------
const FUELS = ["Gasoline", "Diesel", "Electricity"];
const FUEL_COLOR = {
  Gasoline: "#6b7280",
  Diesel: "#d97706",
  Electricity: "#059669"
};

const VIEW_W = 900;
const VIEW_H = 560;
const MARGIN = { top: 20, right: 30, bottom: 62, left: 70 };
const IW = VIEW_W - MARGIN.left - MARGIN.right;
const IH = VIEW_H - MARGIN.top - MARGIN.bottom;

// ---------- parameters / state ----------
const state = {
  scene: 0,
  visibleFuels: new Set(FUELS),
  cylinderFilter: "all"
};

let data = [];

// ---------- scene definitions ----------
const scenes = [
  {
    title: "Scene 1 · The Big Picture: City vs. Highway MPG",
    desc:
      "Each circle is a 2017 car model, positioned by its average city and " +
      "highway fuel economy (log scales). Most cars huddle together in the " +
      "lower-left — but a small group floats far away in the upper-right. " +
      "What separates them? Click Next to find out."
  },
  {
    title: "Scene 2 · Fuel Type Is the Great Divider",
    desc:
      "Coloring the same chart by fuel type reveals the answer: the distant " +
      "high-efficiency group is entirely electric. Diesels edge out gasoline " +
      "cars, but electric vehicles operate in a different league, at 3–4× " +
      "the equivalent efficiency of typical gasoline cars."
  },
  {
    title: "Scene 3 · Within Gasoline Cars, Cylinders Tell the Story",
    desc:
      "Restricting the view to gasoline cars and sizing/coloring each circle " +
      "by engine cylinders shows a clear trend: the more cylinders, the worse " +
      "the fuel economy. The 4-cylinder cluster tops the chart while 10- and " +
      "12-cylinder engines sit at the bottom."
  },
  {
    title: "Scene 4 · Explore the Data Yourself",
    desc:
      "Now it is your turn. Hover over any circle to see the make, fuel, " +
      "cylinders and MPG of that car. Use the fuel-type toggles and the " +
      "cylinder dropdown below to filter the chart and test the story: does " +
      "fuel type — and then cylinder count — really drive fuel economy?"
  }
];

// ---------- static setup ----------
const svg = d3
  .select("#chart")
  .attr("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

const tooltip = d3.select("#tooltip");

// log scales, following the course scatterplot example
const x = d3.scaleLog().domain([10, 150]).range([0, IW]);
const y = d3.scaleLog().domain([10, 150]).range([IH, 0]);

const cylExtentColor = d3
  .scaleSequential(d3.interpolateYlOrRd)
  .domain([2, 12]);

const radius = d => 3 + Number(d.EngineCylinders) * 0.9;

// ---------- data load ----------
d3.csv("cars2017.csv").then(raw => {
  data = raw.map(d => ({
    Make: d.Make,
    Fuel: d.Fuel,
    EngineCylinders: +d.EngineCylinders,
    AverageHighwayMPG: +d.AverageHighwayMPG,
    AverageCityMPG: +d.AverageCityMPG
  }));
  buildNav();
  render();
});

// ---------- navigation (triggers for the scene parameter) ----------
function buildNav() {
  const dots = d3.select("#dots");
  scenes.forEach((s, i) => {
    dots
      .append("button")
      .attr("class", "dot")
      .attr("title", s.title)
      .attr("aria-label", `Go to scene ${i + 1}`)
      .on("click", () => {
        state.scene = i;
        render();
      });
  });

  d3.select("#btn-prev").on("click", () => {
    if (state.scene > 0) {
      state.scene -= 1;
      render();
    }
  });
  d3.select("#btn-next").on("click", () => {
    if (state.scene < scenes.length - 1) {
      state.scene += 1;
      render();
    }
  });
  d3.select("body").on("keydown", () => {
    if (d3.event.key === "ArrowRight" && state.scene < scenes.length - 1) {
      state.scene += 1;
      render();
    } else if (d3.event.key === "ArrowLeft" && state.scene > 0) {
      state.scene -= 1;
      render();
    }
  });
}

// ---------- master render: parameters -> scene ----------
function render() {
  // scene header + nav state
  d3.select("#scene-title").text(scenes[state.scene].title);
  d3.select("#scene-desc").text(scenes[state.scene].desc);
  d3.selectAll(".dot").classed("active", (d, i) => i === state.scene);
  d3.select("#btn-prev").property("disabled", state.scene === 0);
  d3.select("#btn-next").property("disabled", state.scene === scenes.length - 1);

  // clear and repopulate the SVG (scene template)
  svg.html("");
  tooltip.classed("hidden", true);

  const g = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  drawAxes(g);

  switch (state.scene) {
    case 0: drawScene1(g); break;
    case 1: drawScene2(g); break;
    case 2: drawScene3(g); break;
    case 3: drawScene4(g); break;
  }

  drawControls();
}

// ---------- shared chart pieces ----------
function drawAxes(g) {
  const tickVals = [10, 20, 50, 100];

  g.append("g")
    .attr("transform", `translate(0,${IH})`)
    .call(d3.axisBottom(x).tickValues(tickVals).tickFormat(d3.format("~s")));

  g.append("g").call(
    d3.axisLeft(y).tickValues(tickVals).tickFormat(d3.format("~s"))
  );

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", IW / 2)
    .attr("y", IH + 44)
    .attr("text-anchor", "middle")
    .text("Average City MPG (log scale)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -IH / 2)
    .attr("y", -48)
    .attr("text-anchor", "middle")
    .text("Average Highway MPG (log scale)");
}

function drawCircles(g, rows, opts) {
  return g
    .selectAll("circle.car")
    .data(rows)
    .enter()
    .append("circle")
    .attr("class", "car")
    .attr("cx", d => x(d.AverageCityMPG))
    .attr("cy", d => y(d.AverageHighwayMPG))
    .attr("r", d => (opts.r ? opts.r(d) : 5))
    .attr("fill", d => (opts.fill ? opts.fill(d) : "#94a3b8"))
    .attr("fill-opacity", opts.opacity != null ? opts.opacity : 0.65)
    .attr("stroke", "#334155")
    .attr("stroke-width", 0.5);
}

function addAnnotations(g, annotations) {
  const maker = d3
    .annotation()
    .type(d3.annotationCalloutElbow)
    .annotations(annotations);
  g.append("g").attr("class", "annotation-group").call(maker);
}

function drawFuelLegend(g) {
  const legend = g
    .append("g")
    .attr("transform", `translate(${IW - 150}, ${IH - 110})`);

  FUELS.forEach((f, i) => {
    const item = legend
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(0, ${i * 22})`);
    item
      .append("circle")
      .attr("r", 6)
      .attr("fill", FUEL_COLOR[f])
      .attr("fill-opacity", 0.75);
    item.append("text").attr("x", 12).attr("dy", "0.35em").text(f);
  });
}

// ---------- scene 1: overview ----------
function drawScene1(g) {
  drawCircles(g, data, {});

  addAnnotations(g, [
    {
      note: {
        title: "The main pack",
        label:
          "Most 2017 models cluster here, between roughly 15 and 45 MPG in the city and on the highway.",
        wrap: 170
      },
      x: x(22),
      y: y(28),
      dx: -10,
      dy: -130
    },
    {
      note: {
        title: "The mysterious outliers",
        label:
          "A separate group reaches 100+ MPG equivalent. Something fundamental sets these cars apart.",
        wrap: 170
      },
      x: x(110),
      y: y(105),
      dx: -60,
      dy: 110
    }
  ]);
}

// ---------- scene 2: fuel type ----------
function drawScene2(g) {
  drawCircles(g, data, {
    fill: d => FUEL_COLOR[d.Fuel],
    opacity: 0.7
  });

  drawFuelLegend(g);

  addAnnotations(g, [
    {
      note: {
        title: "All electric",
        label:
          "Every one of the high-efficiency outliers runs on electricity (MPGe). No combustion car comes close.",
        wrap: 170
      },
      x: x(110),
      y: y(105),
      dx: -70,
      dy: 120
    },
    {
      note: {
        title: "Diesel: a modest edge",
        label:
          "Diesel models sit near the top of the combustion pack, slightly ahead of comparable gasoline cars.",
        wrap: 165
      },
      x: x(30),
      y: y(37),
      dx: 65,
      dy: -60
    }
  ]);
}

// ---------- scene 3: cylinders within gasoline ----------
function drawScene3(g) {
  const gas = data.filter(d => d.Fuel === "Gasoline");

  drawCircles(g, gas, {
    fill: d => cylExtentColor(d.EngineCylinders),
    r: radius,
    opacity: 0.8
  });

  // small cylinder legend
  const legend = g
    .append("g")
    .attr("transform", `translate(${IW - 190}, ${IH - 132})`);
  legend
    .append("text")
    .attr("class", "axis-label")
    .attr("y", -8)
    .text("Engine cylinders");
  [4, 6, 8, 12].forEach((c, i) => {
    const item = legend
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(${i * 46}, 10)`);
    item
      .append("circle")
      .attr("r", 3 + c * 0.9)
      .attr("fill", cylExtentColor(c))
      .attr("fill-opacity", 0.85)
      .attr("stroke", "#334155")
      .attr("stroke-width", 0.5);
    item
      .append("text")
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .text(c);
  });

  addAnnotations(g, [
    {
      note: {
        title: "Small engines, big economy",
        label:
          "4-cylinder gasoline cars dominate the efficient end, around 25–40 MPG.",
        wrap: 160
      },
      x: x(32),
      y: y(40),
      dx: 55,
      dy: -45
    },
    {
      note: {
        title: "Cylinder penalty",
        label:
          "10- and 12-cylinder engines pay for their power: most manage under 15 MPG in the city.",
        wrap: 160
      },
      x: x(12.5),
      y: y(19),
      dx: 80,
      dy: 60
    }
  ]);
}

// ---------- scene 4: free exploration ----------
function drawScene4(g) {
  const rows = data.filter(
    d =>
      state.visibleFuels.has(d.Fuel) &&
      (state.cylinderFilter === "all" ||
        d.EngineCylinders === +state.cylinderFilter)
  );

  const circles = drawCircles(g, rows, {
    fill: d => FUEL_COLOR[d.Fuel],
    r: radius,
    opacity: 0.75
  });

  drawFuelLegend(g);

  // tooltip triggers (free-form drill-down at the mouth of the martini glass)
  circles
    .on("mouseover", function(d) {
      d3.select(this)
        .attr("stroke-width", 2)
        .attr("stroke", "#111827");
      tooltip
        .classed("hidden", false)
        .html(
          `<div class="tt-title">${d.Make}</div>` +
            `Fuel: ${d.Fuel}<br>` +
            `Cylinders: ${d.EngineCylinders}<br>` +
            `City MPG: ${d.AverageCityMPG}<br>` +
            `Highway MPG: ${d.AverageHighwayMPG}`
        );
    })
    .on("mousemove", function() {
      const [mx, my] = d3.mouse(document.getElementById("chart-wrap"));
      tooltip.style("left", mx + 14 + "px").style("top", my + 10 + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("stroke-width", 0.5)
        .attr("stroke", "#334155");
      tooltip.classed("hidden", true);
    });

  if (rows.length === 0) {
    g.append("text")
      .attr("x", IW / 2)
      .attr("y", IH / 2)
      .attr("text-anchor", "middle")
      .attr("class", "axis-label")
      .text("No cars match the current filters — try widening them.");
  }
}

// ---------- scene-4 filter controls (triggers) ----------
function drawControls() {
  const box = d3.select("#controls");
  box.html("");

  if (state.scene !== 3) return;

  box.append("label").text("Fuel:");
  FUELS.forEach(f => {
    box
      .append("button")
      .attr("class", "fuel-toggle" + (state.visibleFuels.has(f) ? " on" : ""))
      .attr("data-fuel", f)
      .text(f)
      .on("click", () => {
        if (state.visibleFuels.has(f)) state.visibleFuels.delete(f);
        else state.visibleFuels.add(f);
        render();
      });
  });

  box.append("label").text("Cylinders:");
  const cylValues = Array.from(
    new Set(data.map(d => d.EngineCylinders))
  ).sort((a, b) => a - b);

  const select = box.append("select").on("change", function() {
    state.cylinderFilter = this.value;
    render();
  });
  select.append("option").attr("value", "all").text("All");
  cylValues.forEach(c => {
    select
      .append("option")
      .attr("value", c)
      .text(c === 0 ? "0 (electric)" : c);
  });
  select.property("value", state.cylinderFilter);

  box.append("span").attr("class", "hint").text("Hover a circle for details");
}
