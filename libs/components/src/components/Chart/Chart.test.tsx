import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Chart } from "./Chart";

// Mock Chart.js and react-chartjs-2
vi.mock("chart.js", () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  ArcElement: vi.fn(),
  RadialLinearScale: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  Filler: vi.fn(),
}));

vi.mock("react-chartjs-2", () => ({
  Line: ({ data, options }: any) => <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />,
  Bar: ({ data, options }: any) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />,
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />
  ),
  Radar: ({ data, options }: any) => <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)} />,
}));

describe("Chart", () => {
  const mockData = {
    labels: ["Jan", "Feb", "Mar", "Apr"],
    datasets: [
      {
        label: "Dataset 1",
        data: [10, 20, 30, 40],
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  it("should render line chart", () => {
    const { getByTestId } = render(<Chart type="line" data={mockData} />);

    const chart = getByTestId("line-chart");
    expect(chart).toBeInTheDocument();
  });

  it("should render bar chart", () => {
    const { getByTestId } = render(<Chart type="bar" data={mockData} />);

    const chart = getByTestId("bar-chart");
    expect(chart).toBeInTheDocument();
  });

  it("should render doughnut chart", () => {
    const { getByTestId } = render(<Chart type="doughnut" data={mockData} />);

    const chart = getByTestId("doughnut-chart");
    expect(chart).toBeInTheDocument();
  });

  it("should render radar chart", () => {
    const { getByTestId } = render(<Chart type="radar" data={mockData} />);

    const chart = getByTestId("radar-chart");
    expect(chart).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<Chart type="line" data={mockData} className="custom-chart" />);

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveClass("custom-chart");
  });

  it("should set custom height", () => {
    const { container } = render(<Chart type="line" data={mockData} height={500} />);

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveStyle("height: 500px");
  });

  it("should use default height when not specified", () => {
    const { container } = render(<Chart type="line" data={mockData} />);

    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer).toHaveStyle("height: 300px");
  });

  it("should merge custom options with defaults", () => {
    const customOptions = {
      plugins: {
        legend: {
          display: false,
        },
      },
    };

    const { getByTestId } = render(<Chart type="line" data={mockData} options={customOptions} />);

    const chart = getByTestId("line-chart");
    const options = JSON.parse(chart.getAttribute("data-chart-options") || "{}");

    expect(options.plugins.legend.display).toBe(false);
    expect(options.responsive).toBe(true); // Should still have default options
  });

  it("should add title when provided", () => {
    const title = "Test Chart Title";
    const { getByTestId } = render(<Chart type="line" data={mockData} title={title} />);

    const chart = getByTestId("line-chart");
    const options = JSON.parse(chart.getAttribute("data-chart-options") || "{}");

    expect(options.plugins.title.display).toBe(true);
    expect(options.plugins.title.text).toBe(title);
  });

  it("should not add title when not provided", () => {
    const { getByTestId } = render(<Chart type="line" data={mockData} />);

    const chart = getByTestId("line-chart");
    const options = JSON.parse(chart.getAttribute("data-chart-options") || "{}");

    expect(options.plugins.title).toBeUndefined();
  });

  it("should pass data to chart component", () => {
    const { getByTestId } = render(<Chart type="bar" data={mockData} />);

    const chart = getByTestId("bar-chart");
    const chartData = JSON.parse(chart.getAttribute("data-chart-data") || "{}");

    expect(chartData.labels).toEqual(mockData.labels);
    expect(chartData.datasets).toEqual(mockData.datasets);
  });
});
