const TABLES: Record<string, string> = {
  inspection_checks: "Checklist", inspection_measurements: "Dimension", inspection_defects: "Defects",
  attachments: "Photo", ncrs: "NCR", sampling_bands: "Sampling band", sampling_acceptance: "Acceptance",
  suppliers: "Supplier", parts: "Part", templates: "Template", template_versions: "Template version", profiles: "User",
};
const FIELDS: Record<string, string> = {
  status: "Status", lot_no: "Lot no.", po_no: "PO no.", do_no: "DO no.", qty_received: "Quantity", received_at: "Received at",
  sample_size: "Sample size", sample_override_reason: "Override reason", stage: "Stage", disposition: "Disposition",
  verdict: "Verdict", approver_id: "Approver", approved_at: "Approved at", submitted_at: "Submitted at",
  return_comment: "Return comment", concession_reason: "Concession reason", reopen_reason: "Reopen reason",
  result: "Result", comment: "Comment", readings: "Readings", found: "Found", description: "Description",
  scar_no: "SCAR no.", rma_no: "RMA no.", supplier_response: "Supplier response", closed_at: "Closed at",
  instrument: "Instrument", section_notes: "Section notes", role: "Role", active: "Active",
};

const show = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "(empty)";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
};

// Turns one audit_log row into short human-readable lines for the history panel.
export function describeChange(e: { table_name: string; action: string; changes: Record<string, unknown> }): string[] {
  const label = TABLES[e.table_name] ?? e.table_name;
  if (e.table_name === "inspections" && e.action === "insert") return [`Inspection ${show(e.changes.number)} created`];
  if (e.action === "insert") return [`${label} added`];
  if (e.action === "delete") return [`${label} removed`];
  const prefix = e.table_name === "inspections" ? "" : `${label}: `;
  return Object.entries(e.changes).map(([field, pair]) => {
    const [from, to] = Array.isArray(pair) ? pair : [undefined, pair];
    return `${prefix}${FIELDS[field] ?? field}: ${show(from)} → ${show(to)}`;
  });
}
