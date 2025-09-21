import { onMount, onCleanup } from "solid-js";
import ApexCharts from "apexcharts";

export default function ApexChart(props) {
  let chartEl;
  let chart;

  onMount(() => {
    const isPie = props.type === "pie" || props.type === "donut";

    const options = {
      chart: { type: props.type || "line", height: props.height || 300 },
      ...props.options,
      series: isPie ? props.series : props.series || [],
    };

    chart = new ApexCharts(chartEl, options);
    chart.render();

    onCleanup(() => chart.destroy());
  });

  return <div ref={chartEl}></div>;
}
