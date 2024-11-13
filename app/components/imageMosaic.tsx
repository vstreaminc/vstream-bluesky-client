import { useDeferredValue, useMemo, type ReactNode } from "react";
import invariant from "tiny-invariant";
import { cn } from "~/lib/utils";

type ImageMosaicItem = {
  id: string;
  aspectRatio: number;
};

/** Props for {@link ImageMosaic} */
export type ImageMosaicProps<T extends ImageMosaicItem> = {
  items: T[];
  render: (item: T, idx: number) => ReactNode;
  className?: string;
  // Controls spacing between Images in ImageMosaic
  // We can't use gap-# because it messes up the aspect ratios,
  // so we have to accept that the gap varies based on container size
  gapPercentage?: number; // % of ImageMosaic width
};

/**
 * Arranges elements with aspect ratios (such as images) into a mosaic grid.
 * Avoid using with over 10 elements, as it will take too long to compute.
 */
export function ImageMosaic<T extends ImageMosaicItem>({
  items,
  render,
  className,
  gapPercentage,
}: ImageMosaicProps<T>) {
  // useDeferredValue has two benefits
  // 1. Avoids blocking the UI while we spend up to 100ms figuring out how render the mosaic
  // 2. Keeps the old layout around for a fraction of a second which makes our drag-and-drop animation
  // look way better.
  const deferredItems = useDeferredValue(items);
  const aspectRatios = useMemo(
    () => deferredItems.map((i) => i.aspectRatio),
    [deferredItems],
  );
  console.log(aspectRatios);
  const grid = useMemo(
    () => imageMosaicLayout(aspectRatios, gapPercentage),
    // Using JSON.stringify is a hack to minimize recomputations by comparing values instead of array pointers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(aspectRatios), gapPercentage],
  );
  if (!grid) {
    return <div></div>;
  }

  return (
    <div
      className={cn("relative transition-all duration-300", className)}
      style={{ aspectRatio: `${grid.aspectRatio ?? ""}` }}
    >
      {grid.items.map((i) => (
        <div
          key={deferredItems[i.idx].id}
          className="absolute transition-all duration-300"
          style={{
            left: `${i.left * 100}%`,
            top: `${i.top * 100}%`,
            width: `${i.width * 100}%`,
            height: `${i.height * 100}%`,
          }}
        >
          {render(deferredItems[i.idx], i.idx)}
        </div>
      ))}
    </div>
  );
}

type ImageMosaicIndexedAspectRatio = {
  idx: number;
  aspectRatio: number;
};
type ImageMosaicGridItem = {
  type: "item";
  item: ImageMosaicIndexedAspectRatio;
  aspectRatio: number;
  height?: number;
  width?: number;
};
type ImageMosaicGridCols = {
  type: "cols";
  cols: ImageMosaicGrid[];
  aspectRatio: number;
};
type ImageMosaicGridRows = {
  type: "rows";
  rows: ImageMosaicGrid[];
  aspectRatio: number;
};
type ImageMosaicGrid =
  | ImageMosaicGridItem
  | ImageMosaicGridCols
  | ImageMosaicGridRows;
type ImageMosaicResult = {
  aspectRatio: number;
  items: {
    idx: number;
    left: number;
    top: number;
    width: number;
    height: number;
  }[];
};
function imageMosaicLayout(aspectRatios: number[], gapPercentage?: number) {
  // We need at least one item if we want to display something
  if (aspectRatios.length === 0) {
    return undefined;
  }

  // Save the original index of the items to be used in rendering
  const indexedRatios = aspectRatios.map((aspectRatio, idx) => ({
    idx,
    aspectRatio,
  }));

  // Limit gap to the range 0-0.1 (0%-10%) with a default of 0.01 (1%)
  // Visual testing shows over 10% gap can break the grid and looks awful
  const gap = !gapPercentage
    ? 0.01
    : gapPercentage < 0
      ? 0
      : gapPercentage > 0.1
        ? 0.1
        : gapPercentage;

  // First, determine all possible ways to divide `items` into rows, ensuring ordering stays intact and items can be read in order left-to-right, top-to-bottom
  let layouts = [[[indexedRatios[0]]]];
  for (const i of indexedRatios.slice(1)) {
    layouts = layouts.flatMap((l) => {
      // What if we add the item to the "right" of the last item?
      // In other words, add it to the end of the last existing row
      const r = [...l.slice(0, -1), [...l[l.length - 1], i]];
      // What if we add the item to the "bottom" of the last item?
      // In other words, add it to a new row at the end of the layout
      const b = [...l, [i]];
      return [r, b];
    });
  }

  // For each layout, calculate all the ways we can have items span multiple rows/cols
  // Then for each calculate a rough score based on approximate sizing information
  // and choose the best layout. Uses inexact numbers for performance reasons.
  const scores = layouts.flatMap(strechItemsAcrossRows).map(calcScores);

  let winner = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i].score < winner.score) {
      winner = scores[i];
    }
  }

  // Now that we have a best layout, we can spend the time to get the exact sizing info
  // Which we'll need to render the component
  return calcRealSize(winner, gap);
}

function mergeRows(a: ImageMosaicGrid, b: ImageMosaicGrid) {
  return {
    type: "rows" as const,
    rows: b.type === "rows" ? [a, ...b.rows] : [a, b],
    aspectRatio: 1 / (1 / a.aspectRatio + 1 / b.aspectRatio),
  };
}
function mergeCols(a: ImageMosaicGrid, b: ImageMosaicGrid) {
  return {
    type: "cols" as const,
    cols: b.type === "cols" ? [a, ...b.cols] : [a, b],
    aspectRatio: a.aspectRatio + b.aspectRatio,
  };
}
function strechItemsAcrossRows(
  items: ImageMosaicIndexedAspectRatio[][],
): ImageMosaicGrid[] {
  // We need at least two rows to "stretch" an item across, so handle the 0 & 1 row cases explicitly
  if (items.length === 0) {
    return [];
  }
  if (items.length === 1) {
    const cols = items[0].map((item) => ({
      type: "item" as const,
      item,
      aspectRatio: item.aspectRatio,
    }));
    return [
      {
        type: "cols" as const,
        cols,
        aspectRatio: cols.reduce((s, i) => s + i.aspectRatio, 0),
      },
    ];
  }
  // We also need at least two items in the first row, so handle that
  if (items[0].length < 2) {
    const cols = items[0].map((item) => ({
      type: "item" as const,
      item,
      aspectRatio: item.aspectRatio,
    }));
    const row1 = {
      type: "cols" as const,
      cols,
      aspectRatio: cols.reduce((s, i) => s + i.aspectRatio, 0),
    };
    return strechItemsAcrossRows(items.slice(1)).map((l) => mergeRows(row1, l));
  }
  // Great, we have 2+ rows and 2+ items in the first row. We only need to care about stretching items[0][0].
  // We want to stretch it so that it fills a single row (the existing layout), all the rows, or anything in-between
  const ret: ImageMosaicGrid[] = [];
  for (let idx = 0; idx < items.length; idx++) {
    // For each "stretch" we divide the layout into 3 sections: The item being stretched, the rows of items to the "right" of it, and the rows of items "below" it
    // We then recursively call strechItemsAcrossRows for the "right" and "below" groups, then merge all the results together
    const stretchedItem = {
      type: "item" as const,
      item: items[0][0],
      aspectRatio: items[0][0].aspectRatio,
    };
    const right = strechItemsAcrossRows([
      items[0].slice(1),
      ...items.slice(1, idx + 1),
    ]);
    const bottom = strechItemsAcrossRows(items.slice(idx + 1));
    if (bottom.length === 0) {
      // If we stretched the item across all rows, there won't be anything "below", so only consider "right" options
      for (const r of right) {
        ret.push(mergeCols(stretchedItem, r));
      }
    }
    for (const b of bottom) {
      for (const r of right) {
        ret.push(mergeRows(mergeCols(stretchedItem, r), b));
      }
    }
  }
  return ret;
}

function setSize(grid: ImageMosaicGrid, width: number, height: number) {
  // Recursive helper to fill the `width` and `height` field in the nested grids
  switch (grid.type) {
    case "item":
      grid.width = width;
      grid.height = height;
      return;
    case "cols":
      grid.cols.forEach((c) => {
        setSize(c, (width * c.aspectRatio) / grid.aspectRatio, height);
      });
      return;
    case "rows":
      grid.rows.forEach((r) => {
        setSize(r, width, (height * grid.aspectRatio) / r.aspectRatio);
      });
      return;
    default:
      assertNever(grid);
  }
}

function calcScores(grid: ImageMosaicGrid) {
  // Our scoring algorithm attempts to select the layout where the items are most "evenly sized"
  // We do this by determining what percentage of the overall area each image gets, ignoring aspect ratio
  // then calculating SUM((imageSize - averageSize)^2), and adding score penalties if the overall aspect ratio
  // is too wide or too tall. I honestly don't know why this works, but it has good results in the real world.
  // Technically these are a bit off since it doesn't count GAP, but it's close enough for scoring

  setSize(grid, 1, 1); // mutates shared state, but its OK because future calls will override it anyway

  // This doesn't use `flatMap` since `forEach` & `push` saves tens of milliseconds in the worst case
  const items: ImageMosaicGridItem[] = [];
  const getItems = (g: ImageMosaicGrid) => {
    g.type === "rows"
      ? g.rows.forEach(getItems)
      : g.type === "cols"
        ? g.cols.forEach(getItems)
        : items.push(g);
  };
  getItems(grid);

  const sizes = items.map((i) => {
    invariant(i.height);
    invariant(i.width);
    return i.height * i.width;
  });
  const avgSize =
    sizes.reduce((sum, itemSize) => sum + itemSize, 0) / sizes.length;
  const score =
    sizes.reduce(
      (sum, itemSize) => sum + (itemSize - avgSize) * (itemSize - avgSize),
      0,
    ) / sizes.length;
  return {
    ...grid,
    score:
      grid.aspectRatio < 2 / 3
        ? score + 3000
        : grid.aspectRatio > 24 / 9
          ? score + 2000
          : grid.aspectRatio < 1
            ? score + 1000
            : score,
  };
}

function calcRealSize(grid: ImageMosaicGrid, gap: number): ImageMosaicResult {
  const items: {
    item: ImageMosaicIndexedAspectRatio;
    w(): number;
    h(): number;
    x(): number;
    y(): number;
  }[] = [];
  const S = LinearSystemSolver();
  const makeEquations = (
    g: ImageMosaicGrid,
    x: () => number,
    y: () => number,
  ) => {
    switch (g.type) {
      case "item":
        return (() => {
          const iw = S.var(`item ${g.item.idx} width`);
          const ih = S.var(`item ${g.item.idx} height`);
          // Ensure each item's aspect ratio is fixed to the correct size
          // w / h = aspectRatio -> w = aspectRatio * h -> 0 = aspectRatio * h + -1 * w
          S.equation({ [ih]: g.item.aspectRatio, [iw]: -1 }, 0);
          items.push({
            h: () => S.get(ih),
            item: g.item,
            w: () => S.get(iw),
            x,
            y,
          });
          return { w: iw, h: ih };
        })();
      case "cols":
        return (() => {
          let mutX = x;
          const cv = g.cols.map((c) => {
            const ret = makeEquations(c, mutX, y);
            const x = mutX; // Copy current reference to mutX so it becomes immutable
            mutX = () => x() + gap + S.get(ret.w);
            return ret;
          });
          const cw = S.var(`cols width`);
          const ch = S.var(`cols height`);
          // In a given row, all heights should be identical and match the row height
          cv.map(({ h }) => {
            S.equation({ [h]: 1, [ch]: -1 }, 0);
          });
          // rowWidth - sum(itemWidths) = gaps between items
          // Since `gap` is a percentage of grid width, and because grid width is fixed at 1, we can treat gap width as a constant
          S.equation(
            { [cw]: 1, ...Object.fromEntries(cv.map(({ w }) => [w, -1])) },
            gap * (g.cols.length - 1),
          );
          return { w: cw, h: ch };
        })();
      case "rows":
        return (() => {
          let mutY = y;
          const rv = g.rows.map((r) => {
            const ret = makeEquations(r, x, mutY);
            const y = mutY; // Copy current reference to mutY so it becomes immutable
            mutY = () => y() + gap + S.get(ret.h);
            return ret;
          });
          const rw = S.var(`rows width`);
          const rh = S.var(`rows height`);
          // In a given column, all widths should be identical and match the column width
          rv.map(({ w }) => {
            S.equation({ [w]: 1, [rw]: -1 }, 0);
          });
          // columnWidth - sum(itemWidths) = gaps between items
          // Since `gap` is a percentage of grid width, and because grid width is fixed at 1, we can treat gap width as a constant
          S.equation(
            { [rh]: 1, ...Object.fromEntries(rv.map(({ h }) => [h, -1])) },
            gap * (g.rows.length - 1),
          );
          return { w: rw, h: rh };
        })();
      default:
        assertNever(g);
        throw "unreachable";
    }
  };
  const { w, h } = makeEquations(
    grid,
    () => 0,
    () => 0,
  );
  S.equation({ [w]: 1 }, 1); // grid width should always be 1.0, or 100%, so that `gap` is properly a percentage of the overall width
  S.solve();

  return {
    aspectRatio: S.get(w) / S.get(h),
    items: items.map((i) => ({
      height: i.h() / S.get(h),
      idx: i.item.idx,
      left: i.x() / S.get(w),
      top: i.y() / S.get(h),
      width: i.w() / S.get(w),
    })),
  };
}

// Convienence class for solving systems of linear equations
// Knows how to turn equations into an augmented matrix,
// solve the matrix with Gauss-Jordan elimination, then
// return the values of the variables.
function LinearSystemSolver() {
  const SOLUTION = Symbol("Solver Equation Solution");
  const variables: symbol[] = [];
  const equations: Record<symbol, number>[] = [];
  let _solution: Record<symbol, number> | undefined = undefined;
  const gaussJordanElimination = (M: number[][]) => {
    const L = M.length;
    for (let c = 0; c < L; c++) {
      let r = c;
      while (r < L && M[r][c] === 0) {
        r++;
      }
      if (r >= L) {
        throw new Error("Cannot calculate inverse, determinant is zero");
      }
      if (r !== c) {
        // If the pivot wasn't on our starting row, swap the rows so it is
        const t = M[c];
        M[c] = M[r];
        M[r] = t;
      }

      // Divide the whole row by the value so we know it's the identity matrix
      const D = M[c][c];
      for (let cc = 0; cc < L + 1; cc++) {
        M[c][cc] /= D;
      }

      // Now subtract from all the other rows so this is the only row containing this variable
      for (let r = 0; r < L; r++) {
        if (r === c || M[r][c] === 0) {
          continue;
        }

        const S = M[r][c];
        for (let cc = 0; cc < L + 1; cc++) {
          M[r][cc] -= S * M[c][cc];
        }
      }
    }
  };

  return {
    // Create a new variable that can be used in equations
    var(name: string) {
      if (_solution) {
        throw new Error("already solved");
      }
      const v = Symbol(name);
      variables.push(v);
      return v;
    },
    // Adds a linear equation to the system to be solved later
    // vars is a mapping of variables to their constant multiplier
    // missing variables are assumed to have a multiplier of 0
    equation(vars: Record<symbol, number>, solution: number) {
      if (_solution) {
        throw new Error("already solved");
      }
      for (const k of Object.keys(vars)) {
        if (!variables.includes(k as unknown as symbol)) {
          throw new Error(`invalid variable: ${k}`);
        }
      }
      equations.push({ ...vars, [SOLUTION]: solution });
    },
    // Solves the system of linear equations and returns a mapping of
    // variables to values.
    solve() {
      if (_solution) {
        return _solution;
      }
      if (variables.length !== equations.length) {
        throw new Error(
          `number of variables (${variables.length}) must match number of equations (${equations.length})`,
        );
      }
      const M = equations.map((e) => [
        ...variables.map((v) => e[v] ?? 0),
        e[SOLUTION] ?? 0,
      ]);
      gaussJordanElimination(M);
      _solution = Object.fromEntries(
        variables.map((k, idx) => [k, M[idx].at(-1)]),
      );
      return _solution;
    },
    // Gets the value for a specific variable. Must call `solve` first.
    get(key: symbol) {
      if (!_solution) {
        throw new Error("not yet solved");
      }
      return _solution[key];
    },
  };
}

function assertNever(v: never) {
  if (v) {
    throw new Error("failed assertNever");
  }
}
