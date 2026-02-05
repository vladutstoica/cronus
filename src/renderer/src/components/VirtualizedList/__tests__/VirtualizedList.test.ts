import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { VirtualizedList, VirtualizedListProps } from "../VirtualizedList";

// Mock IntersectionObserver
beforeEach(() => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
});

// Mock ResizeObserver - simple mock that doesn't trigger callbacks
// This prevents infinite loops with the virtualizer
beforeEach(() => {
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

interface TestItem {
  id: string;
  name: string;
}

function createTestItems(count: number): TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
  }));
}

// Helper to create VirtualizedList element with proper typing
function createVirtualizedList(
  props: VirtualizedListProps<TestItem>,
): React.ReactElement {
  return React.createElement(VirtualizedList<TestItem>, props);
}

describe("VirtualizedList", () => {
  describe("rendering", () => {
    it("should render empty div when items array is empty", () => {
      const { container } = render(
        createVirtualizedList({
          items: [],
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
        }),
      );
      expect(container.firstChild).toBeTruthy();
      // Empty list should not have any list items
      expect(container.querySelectorAll("[role='listitem']")).toHaveLength(0);
    });

    it("should render list container with proper ARIA attributes", () => {
      const items = createTestItems(5);
      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          estimateSize: 32,
          maxHeight: 200,
        }),
      );

      const list = container.querySelector("[role='list']");
      expect(list).toBeTruthy();
      expect(list?.getAttribute("aria-label")).toBe("Virtualized list");
      expect(list?.getAttribute("tabindex")).toBe("0");
    });

    it("should apply overflow auto style for scrolling", () => {
      const items = createTestItems(10);
      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          maxHeight: 200,
        }),
      );

      const list = container.querySelector("[role='list']");
      expect(list?.getAttribute("style")).toContain("overflow: auto");
    });
  });

  describe("styling", () => {
    it("should apply custom className", () => {
      const items = createTestItems(5);
      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          className: "custom-class",
        }),
      );

      const list = container.querySelector("[role='list']");
      expect(list?.classList.contains("custom-class")).toBe(true);
      expect(list?.classList.contains("relative")).toBe(true);
    });

    it("should apply maxHeight style", () => {
      const items = createTestItems(5);
      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          maxHeight: 300,
        }),
      );

      const list = container.querySelector("[role='list']");
      expect(list?.getAttribute("style")).toContain("max-height: 300px");
    });

    it("should apply height style when provided", () => {
      const items = createTestItems(5);
      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          height: 400,
        }),
      );

      const list = container.querySelector("[role='list']");
      expect(list?.getAttribute("style")).toContain("height: 400px");
    });
  });

  describe("scrolling", () => {
    it("should call onScroll callback when scrolling", () => {
      const items = createTestItems(50);
      const onScroll = vi.fn();

      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          maxHeight: 200,
          onScroll,
        }),
      );

      const scrollContainer = container.querySelector("[role='list']");
      if (scrollContainer) {
        fireEvent.scroll(scrollContainer);
      }

      expect(onScroll).toHaveBeenCalled();
    });
  });

  describe("keyboard navigation", () => {
    it("should handle keyboard events without error", () => {
      const items = createTestItems(50);
      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          maxHeight: 200,
          estimateSize: 32,
        }),
      );

      const scrollContainer = container.querySelector("[role='list']");
      expect(scrollContainer).toBeTruthy();

      // These should not throw errors
      if (scrollContainer) {
        expect(() =>
          fireEvent.keyDown(scrollContainer, { key: "ArrowDown" }),
        ).not.toThrow();
        expect(() =>
          fireEvent.keyDown(scrollContainer, { key: "ArrowUp" }),
        ).not.toThrow();
        expect(() =>
          fireEvent.keyDown(scrollContainer, { key: "Home" }),
        ).not.toThrow();
        expect(() =>
          fireEvent.keyDown(scrollContainer, { key: "End" }),
        ).not.toThrow();
        expect(() =>
          fireEvent.keyDown(scrollContainer, { key: "PageDown" }),
        ).not.toThrow();
        expect(() =>
          fireEvent.keyDown(scrollContainer, { key: "PageUp" }),
        ).not.toThrow();
      }
    });
  });

  describe("virtual container structure", () => {
    it("should create inner container for virtual height", () => {
      const items = createTestItems(100);
      const { container } = render(
        createVirtualizedList({
          items,
          renderItem: (item) =>
            React.createElement("div", { key: item.id }, item.name),
          maxHeight: 200,
          estimateSize: 32,
        }),
      );

      // The virtualizer creates an inner container with computed height
      const scrollContainer = container.querySelector("[role='list']");
      const innerContainer = scrollContainer?.querySelector("div");
      expect(innerContainer).toBeTruthy();
      expect(innerContainer?.getAttribute("style")).toContain(
        "position: relative",
      );
      expect(innerContainer?.getAttribute("style")).toContain("width: 100%");
    });
  });
});

describe("VirtualizedList props", () => {
  it("should accept all documented props without error", () => {
    const items = createTestItems(10);
    const renderItem = (item: TestItem): React.ReactNode =>
      React.createElement("div", { key: item.id }, item.name);
    const getItemKey = (item: TestItem): string => item.id;
    const onScroll = vi.fn();
    const onRangeChange = vi.fn();

    // This test verifies that all props can be passed without TypeScript errors
    // and the component renders without throwing
    expect(() =>
      render(
        createVirtualizedList({
          items,
          renderItem,
          estimateSize: 40,
          overscan: 10,
          height: 300,
          maxHeight: 500,
          className: "test-class",
          getItemKey,
          onScroll,
          initialScrollOffset: 0,
          gap: 4,
          onRangeChange,
        }),
      ),
    ).not.toThrow();
  });
});
