import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2";
import { clsx } from "clsx";
import styles from "./Chart.module.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

export type ChartType = "line" | "bar" | "doughnut" | "radar";

export interface ChartProps {
  type: ChartType;
  data: ChartData<any>;
  options?: ChartOptions<any>;
  title?: string;
  height?: number;
  className?: string;
}

const defaultOptions: Partial<ChartOptions<any>> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          size: 12,
          weight: "500",
        },
      },
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      cornerRadius: 8,
      titleFont: {
        size: 14,
        weight: "600",
      },
      bodyFont: {
        size: 13,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 12,
        },
      },
    },
    y: {
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
      ticks: {
        font: {
          size: 12,
        },
      },
    },
  },
};

export const Chart: React.FC<ChartProps> = ({ type, data, options = {}, title, height = 300, className }) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      title: title
        ? {
            display: true,
            text: title,
            font: {
              size: 16,
              weight: "600",
            },
            padding: {
              bottom: 20,
            },
          }
        : undefined,
    },
  };

  const ChartComponent = {
    line: Line,
    bar: Bar,
    doughnut: Doughnut,
    radar: Radar,
  }[type];

  return (
    <div className={clsx(styles.container, className)} style={{ height }}>
      <ChartComponent data={data} options={mergedOptions} />
    </div>
  );
};
