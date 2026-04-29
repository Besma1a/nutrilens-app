import { useState, useEffect, useCallback } from "react";
import { planAssignmentsApi } from "../services/api";

function mealIdsEqual(a, b) {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

function buildPatchBody(currentData, form) {
  const patch = {};
  const rawPs = form.portionSize;
  const nextPs = rawPs === "" || rawPs == null ? null : Number(rawPs);
  if (rawPs !== "" && rawPs != null && Number.isNaN(nextPs)) {
    return { error: "Portion size must be a number." };
  }
  const curPs = currentData?.portionSize;
  const curNorm = curPs == null || curPs === "" ? null : Number(curPs);
  if (curNorm !== nextPs) {
    patch.portionSize = nextPs;
  }

  const curDate = (currentData?.scheduledDate || "").toString().slice(0, 10) || "";
  const nextDate = (form.scheduledDate || "").slice(0, 10);
  if (curDate !== nextDate) {
    patch.scheduledDate = nextDate || null;
  }

  const curNotes = (currentData?.notes ?? "").toString();
  const nextNotes = form.notes ?? "";
  if (curNotes !== nextNotes) {
    patch.notes = nextNotes;
  }

  if (!mealIdsEqual(currentData?.mealIds, form.mealIds)) {
    patch.mealIds = form.mealIds;
  }

  return { patch };
}

/**
 * Inline form to PATCH a single plan assignment (portion, date, notes).
 * Props: assignmentId (string|number), currentData (camelCase assignment), onSuccess(updatedAssignment)
 */
export default function Adjustments({ assignmentId, currentData, onSuccess }) {
  const [portionSize, setPortionSize] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [mealIds, setMealIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ps = currentData?.portionSize;
    setPortionSize(ps == null || ps === "" ? "" : String(ps));
    setScheduledDate((currentData?.scheduledDate || "").toString().slice(0, 10));
    setNotes((currentData?.notes ?? "").toString());
    setMealIds(Array.isArray(currentData?.mealIds) ? [...currentData.mealIds] : []);
  }, [currentData]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      const { patch, error: buildErr } = buildPatchBody(currentData, {
        portionSize,
        scheduledDate,
        notes,
        mealIds,
      });
      if (buildErr) {
        setError(buildErr);
        return;
      }
      if (Object.keys(patch).length === 0) {
        setError("Change something before saving.");
        return;
      }
      setLoading(true);
      try {
        const updated = await planAssignmentsApi.patch(assignmentId, patch);
        onSuccess?.(updated);
      } catch (err) {
        setError(err?.message || "Could not save changes.");
      } finally {
        setLoading(false);
      }
    },
    [assignmentId, currentData, portionSize, scheduledDate, notes, mealIds, onSuccess]
  );

  return (
    <form className="mp-adj" onSubmit={handleSubmit}>
      {/* TODO: mealIds selector — wire when catalog / P2 meal references are available */}
      <div className="mp-adj-grid">
        <label className="mp-adj-label">
          Portion size
          <input
            className="mp-adj-input"
            type="number"
            step="any"
            min="0"
            value={portionSize}
            onChange={(ev) => setPortionSize(ev.target.value)}
          />
        </label>
        <label className="mp-adj-label">
          Scheduled date
          <input
            className="mp-adj-input"
            type="date"
            value={scheduledDate}
            onChange={(ev) => setScheduledDate(ev.target.value)}
          />
        </label>
      </div>
      <label className="mp-adj-label">
        Notes
        <textarea
          className="mp-adj-textarea"
          rows={2}
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
        />
      </label>
      {error ? <p className="mp-adj-err">{error}</p> : null}
      <button type="submit" className="mp-adj-submit" disabled={loading}>
        {loading ? "Saving…" : "Save adjustments"}
      </button>
    </form>
  );
}
