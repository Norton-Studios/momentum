import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SelectableList } from "./selectable-list";

// Mock the virtualizer to render all items without virtualization in tests
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 60,
        size: 60,
        key: i,
      })),
    measureElement: () => {},
  }),
}));

describe("SelectableList", () => {
  const mockItems = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ];

  const createDefaultProps = () => ({
    items: mockItems,
    selectedIds: new Set<string>(),
    onToggle: vi.fn(),
    renderItem: (item: { id: string; name: string }) => <span>{item.name}</span>,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all items", () => {
    render(<SelectableList {...createDefaultProps()} />);

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("renders empty message when no items", () => {
    render(<SelectableList {...createDefaultProps()} items={[]} />);

    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders custom empty message", () => {
    render(<SelectableList {...createDefaultProps()} items={[]} emptyMessage="Custom empty message" />);

    expect(screen.getByText("Custom empty message")).toBeInTheDocument();
  });

  it("renders checkboxes for each item", () => {
    render(<SelectableList {...createDefaultProps()} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
  });

  it("marks selected items as checked", () => {
    const selectedIds = new Set(["1", "3"]);
    render(<SelectableList {...createDefaultProps()} selectedIds={selectedIds} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  it("calls onToggle when checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<SelectableList {...createDefaultProps()} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(onToggle).toHaveBeenCalledWith("1", true);
  });

  it("calls onToggle with false when unchecking", () => {
    const onToggle = vi.fn();
    const selectedIds = new Set(["1"]);
    render(<SelectableList {...createDefaultProps()} selectedIds={selectedIds} onToggle={onToggle} />);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    expect(onToggle).toHaveBeenCalledWith("1", false);
  });

  it("renders items with data-testid for testing", () => {
    render(<SelectableList {...createDefaultProps()} />);

    const items = screen.getAllByTestId("selectable-item");
    expect(items).toHaveLength(3);
  });

  it("uses custom renderItem function", () => {
    const customRender = (item: { id: string; name: string }) => <div data-testid="custom-render">Custom: {item.name}</div>;
    render(<SelectableList {...createDefaultProps()} renderItem={customRender} />);

    expect(screen.getByText("Custom: Item 1")).toBeInTheDocument();
    expect(screen.getAllByTestId("custom-render")).toHaveLength(3);
  });
});
