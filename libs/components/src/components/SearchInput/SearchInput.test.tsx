import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("should render basic search input", () => {
    render(<SearchInput />);

    const input = screen.getByRole("searchbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Search...");
  });

  it("should render with custom placeholder", () => {
    render(<SearchInput placeholder="Search repositories..." />);

    const input = screen.getByPlaceholderText("Search repositories...");
    expect(input).toBeInTheDocument();
  });

  it("should render search icon", () => {
    const { container } = render(<SearchInput />);

    const searchIcon = container.querySelector("svg");
    expect(searchIcon).toBeInTheDocument();
  });

  it("should handle controlled value", () => {
    render(<SearchInput value="test query" />);

    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("test query");
  });

  it("should handle uncontrolled value", () => {
    render(<SearchInput />);

    const input = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "new search" } });

    expect(input.value).toBe("new search");
  });

  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    render(<SearchInput onChange={onChange} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "search term" } });

    expect(onChange).toHaveBeenCalledWith("search term");
  });

  it("should call onSearch when Enter is pressed", () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "search query" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalledWith("search query");
  });

  it("should not call onSearch for other keys", () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "Tab" });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("should show clear button when value exists and showClearButton is true", () => {
    render(<SearchInput value="test" showClearButton />);

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    expect(clearButton).toBeInTheDocument();
  });

  it("should not show clear button when value is empty", () => {
    render(<SearchInput value="" showClearButton />);

    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("should not show clear button when showClearButton is false", () => {
    render(<SearchInput value="test" showClearButton={false} />);

    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("should default to showing clear button", () => {
    render(<SearchInput value="test" />);

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    expect(clearButton).toBeInTheDocument();
  });

  it("should handle clear button click for controlled component", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<SearchInput value="test" onChange={onChange} onClear={onClear} />);

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("should handle clear button click for uncontrolled component", () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<SearchInput onChange={onChange} onClear={onClear} />);

    const input = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    expect(input.value).toBe("test");

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    fireEvent.click(clearButton);

    expect(input.value).toBe("");
    expect(onChange).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("should call only onChange when onClear is not provided", () => {
    const onChange = vi.fn();
    render(<SearchInput value="test" onChange={onChange} />);

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("should apply custom className", () => {
    const { container } = render(<SearchInput className="custom-search" />);

    expect(container.firstChild).toHaveClass("custom-search");
  });

  it("should pass through additional input props", () => {
    render(<SearchInput disabled autoComplete="off" data-testid="search-input" />);

    const input = screen.getByTestId("search-input");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("autoComplete", "off");
  });

  it("should maintain input type as search", () => {
    render(<SearchInput />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("type", "search");
  });

  it("should render clear button icon", () => {
    render(<SearchInput value="test" />);

    const clearButton = screen.getByRole("button", { name: "Clear search" });
    const clearIcon = clearButton.querySelector("svg");
    expect(clearIcon).toBeInTheDocument();
  });

  it("should handle controlled and uncontrolled state correctly", () => {
    const { rerender } = render(<SearchInput />);

    const input = screen.getByRole("searchbox") as HTMLInputElement;

    // Uncontrolled - can type freely
    fireEvent.change(input, { target: { value: "uncontrolled" } });
    expect(input.value).toBe("uncontrolled");

    // Switch to controlled
    rerender(<SearchInput value="controlled" />);
    expect(input.value).toBe("controlled");

    // Controlled - typing doesn't change value without onChange
    fireEvent.change(input, { target: { value: "attempted change" } });
    expect(input.value).toBe("controlled");
  });

  it("should handle mixed controlled behavior", () => {
    const onChange = vi.fn();
    render(<SearchInput value="initial" onChange={onChange} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "changed" } });

    expect(onChange).toHaveBeenCalledWith("changed");
    // Value should remain "initial" since component is controlled
    expect((input as HTMLInputElement).value).toBe("initial");
  });

  it("should work with all features combined", () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    const onClear = vi.fn();

    const { container } = render(
      <SearchInput
        value="test search"
        onChange={onChange}
        onSearch={onSearch}
        onClear={onClear}
        placeholder="Search everything..."
        className="full-featured-search"
        disabled={false}
      />,
    );

    const input = screen.getByPlaceholderText("Search everything...") as HTMLInputElement;
    const clearButton = screen.getByRole("button", { name: "Clear search" });
    const searchIcon = container.querySelector("svg");

    expect(input.value).toBe("test search");
    expect(clearButton).toBeInTheDocument();
    expect(searchIcon).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("full-featured-search");

    // Test Enter key
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSearch).toHaveBeenCalledWith("test search");

    // Test clear button
    fireEvent.click(clearButton);
    expect(onChange).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalledOnce();
  });
});
