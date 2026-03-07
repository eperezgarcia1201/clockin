"use client";

import { LiquorKindTagList } from "./LiquorKindTagList";

export function LiquorKindManager({
  title,
  addLabel,
  deleteLabel,
  newKindPlaceholder,
  deleteKindPlaceholder,
  noKindsConfigured,
  showMoreKinds,
  showLessKinds,
  newKindValue,
  deleteKindValue,
  kinds,
  createDisabled,
  deleteDisabled,
  onNewKindChange,
  onDeleteKindChange,
  onCreate,
  onDelete,
}: {
  title: string;
  addLabel: string;
  deleteLabel: string;
  newKindPlaceholder: string;
  deleteKindPlaceholder: string;
  noKindsConfigured: string;
  showMoreKinds: string;
  showLessKinds: string;
  newKindValue: string;
  deleteKindValue: string;
  kinds: string[];
  createDisabled: boolean;
  deleteDisabled: boolean;
  onNewKindChange: (value: string) => void;
  onDeleteKindChange: (value: string) => void;
  onCreate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="d-flex flex-column gap-3">
      <h3 className="h6 mb-0">{title}</h3>
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-4">
          <label className="form-label">{title}</label>
          <input
            className="form-control"
            value={newKindValue}
            onChange={(event) => onNewKindChange(event.target.value)}
            placeholder={newKindPlaceholder}
            list="liquor-kind-options"
          />
        </div>
        <div className="col-6 col-md-2">
          <button
            type="button"
            className="btn btn-outline-primary w-100"
            disabled={createDisabled}
            onClick={onCreate}
          >
            {addLabel}
          </button>
        </div>
        <div className="col-12 col-md-4">
          <label className="form-label">{deleteLabel}</label>
          <select
            className="form-select"
            value={deleteKindValue}
            onChange={(event) => onDeleteKindChange(event.target.value)}
          >
            <option value="">{deleteKindPlaceholder}</option>
            {kinds.map((kind) => (
              <option key={`kind-delete-${kind}`} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <button
            type="button"
            className="btn btn-outline-danger w-100"
            disabled={deleteDisabled}
            onClick={onDelete}
          >
            {deleteLabel}
          </button>
        </div>
        <div className="col-12">
          <LiquorKindTagList
            kinds={kinds}
            emptyLabel={noKindsConfigured}
            showMoreLabel={showMoreKinds}
            showLessLabel={showLessKinds}
          />
        </div>
      </div>
    </div>
  );
}
