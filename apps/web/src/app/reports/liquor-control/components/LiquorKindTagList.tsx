"use client";

import { useMemo, useState } from "react";

const DEFAULT_VISIBLE_KINDS = 14;

export function LiquorKindTagList({
  kinds,
  emptyLabel,
  showMoreLabel,
  showLessLabel,
}: {
  kinds: string[];
  emptyLabel: string;
  showMoreLabel: string;
  showLessLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleKinds = useMemo(
    () => (expanded ? kinds : kinds.slice(0, DEFAULT_VISIBLE_KINDS)),
    [expanded, kinds],
  );
  const hiddenKinds = Math.max(0, kinds.length - visibleKinds.length);

  if (kinds.length === 0) {
    return <div className="small text-muted">{emptyLabel}</div>;
  }

  return (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex flex-wrap gap-2">
        {visibleKinds.map((kind) => (
          <span
            key={`liquor-kind-chip-${kind}`}
            className="badge rounded-pill text-bg-light border text-dark fw-normal"
          >
            {kind}
          </span>
        ))}
      </div>
      {hiddenKinds > 0 ? (
        <div>
          <button
            type="button"
            className="btn btn-link btn-sm px-0 text-decoration-none"
            onClick={() => setExpanded((previous) => !previous)}
          >
            {expanded ? showLessLabel : `${showMoreLabel} (${hiddenKinds})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
