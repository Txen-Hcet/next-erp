import { onCleanup, onMount } from "solid-js";
import ApexCharts from "apexcharts";

export default function ApexChart(props) {
  let chartEl;

  onMount(() => {
    const chart = new ApexCharts(chartEl, {
      chart: { type: props.type || "line", height: props.height || 300 },
      series: props.series,
      ...props.options,
    });

    chart.render();

    onCleanup(() => chart.destroy());
  });

  return <div ref={chartEl}></div>;
}
