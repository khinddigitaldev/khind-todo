-- FICTIONAL demo data for the public repo. Never put real KHIND suppliers or parts here.

insert into public.suppliers (code, name, status, email) values
  ('DEMO-S1', 'Alpha Plastics (Demo)', 'approved', 'alpha@example.com'),
  ('DEMO-S2', 'Beta Motors (Demo)', 'approved', 'beta@example.com'),
  ('DEMO-S3', 'Gamma Cartons (Demo)', 'approved', 'gamma@example.com'),
  ('DEMO-S4', 'Delta Wires (Demo)', 'probation', 'delta@example.com')
on conflict (code) do nothing;

insert into public.templates (name) values ('General IQC'), ('Fan motor (Demo)') on conflict (name) do nothing;

insert into public.template_versions (template_id, version)
select t.id, 1 from public.templates t
where t.name in ('General IQC', 'Fan motor (Demo)')
  and not exists (select 1 from public.template_versions v where v.template_id = t.id);

-- The 26 checklist items from iqc-checklist-web.html, for both templates.
with items (section, position, text) as (values
  ('Documentation check', 1, 'PO matches delivery order / invoice (part number, quantity, description)'),
  ('Documentation check', 2, 'Certificate of Conformance (CoC) or Certificate of Analysis (CoA) provided'),
  ('Documentation check', 3, 'Material test report or mill certificate (if applicable)'),
  ('Documentation check', 4, 'Lot / batch number is traceable and matches the documents'),
  ('Documentation check', 5, 'Compliance documents valid (RoHS, REACH, SIRIM, SDS, as applicable)'),
  ('Documentation check', 6, 'Correct drawing / specification revision'),
  ('Packaging and labeling', 7, 'Packaging intact: no damage, crushing, moisture or contamination'),
  ('Packaging and labeling', 8, 'Correct packaging type per spec (ESD bags, cartons, pallets)'),
  ('Packaging and labeling', 9, 'Labels present, legible and correct (part number, quantity, lot, date, supplier)'),
  ('Packaging and labeling', 10, 'Shelf life / expiry date acceptable (if applicable)'),
  ('Packaging and labeling', 11, 'Storage and handling requirements followed (temperature, humidity)'),
  ('Quantity verification', 12, 'Physical count matches the delivery order and PO'),
  ('Quantity verification', 13, 'Any over- or under-delivery recorded and reported to purchasing'),
  ('Visual and cosmetic inspection', 14, 'No scratches, dents, cracks, burrs or deformation'),
  ('Visual and cosmetic inspection', 15, 'No rust, corrosion or discoloration'),
  ('Visual and cosmetic inspection', 16, 'No contamination (dirt, oil, foreign particles)'),
  ('Visual and cosmetic inspection', 17, 'Surface finish and color match the approved sample or spec'),
  ('Visual and cosmetic inspection', 18, 'Printing, markings and logos correct and clear'),
  ('Visual and cosmetic inspection', 19, 'No mixed parts or wrong items in the lot'),
  ('Fit and measuring equipment', 20, 'Measuring instruments used are within calibration date'),
  ('Fit and measuring equipment', 21, 'Fit / assembly check with the mating part (if required)'),
  ('Functional and performance tests', 22, 'Electrical test (voltage, current, continuity, insulation)'),
  ('Functional and performance tests', 23, 'Mechanical test (hardness, torque, tensile, weight)'),
  ('Functional and performance tests', 24, 'Material test (composition, thickness, plating)'),
  ('Functional and performance tests', 25, 'Safety test (hi-pot, earth continuity, temperature rise)'),
  ('Functional and performance tests', 26, 'Environmental test (salt spray, heat resistance) per schedule'))
insert into public.template_items (version_id, section, position, text)
select v.id, i.section, i.position, i.text
from items i
cross join public.template_versions v
join public.templates t on t.id = v.template_id and v.version = 1
where t.name in ('General IQC', 'Fan motor (Demo)')
on conflict (version_id, position) do nothing;

with chars (position, name, nominal, min_value, max_value, unit, defect_class) as (values
  (1, 'Shaft diameter', 8.00, 7.98, 8.02, 'mm', 'critical'::public.defect_class),
  (2, 'Housing outer diameter', 120.0, 119.7, 120.3, 'mm', 'major'::public.defect_class),
  (3, 'Mounting hole pitch', 60.0, 59.8, 60.2, 'mm', 'minor'::public.defect_class))
insert into public.template_characteristics (version_id, position, name, nominal, min_value, max_value, unit, defect_class)
select v.id, c.position, c.name, c.nominal, c.min_value, c.max_value, c.unit, c.defect_class
from chars c
cross join public.template_versions v
join public.templates t on t.id = v.template_id and v.version = 1
where t.name = 'Fan motor (Demo)'
on conflict (version_id, position) do nothing;

insert into public.parts (part_no, name, category, drawing_no, drawing_rev, regulated, template_id, inspection_type)
select p.part_no, p.name, p.category, p.drawing_no, p.drawing_rev, p.regulated, t.id, p.inspection_type::public.inspection_type
from (values
  ('DEMO-P1', 'Fan blade 16" (Demo)', 'Plastic parts', 'DRW-DEMO-001', 'B', false, 'General IQC', 'sampling'),
  ('DEMO-P2', 'Fan motor 45W (Demo)', 'Motors', 'DRW-DEMO-002', 'C', false, 'Fan motor (Demo)', 'sampling'),
  ('DEMO-P3', 'Gift box carton (Demo)', 'Packaging', 'DRW-DEMO-003', 'A', false, 'General IQC', 'sampling'),
  ('DEMO-P4', 'Control knob (Demo)', 'Plastic parts', 'DRW-DEMO-004', 'A', false, 'General IQC', 'full'),
  ('DEMO-P5', 'Power cord 3-pin (Demo)', 'Electrical', 'DRW-DEMO-005', 'D', true, 'General IQC', 'sampling')
) as p (part_no, name, category, drawing_no, drawing_rev, regulated, template_name, inspection_type)
join public.templates t on t.name = p.template_name
on conflict (part_no) do nothing;

-- Example KHIND sampling table from PRD §7 (NOT validated; QA must set real values).
insert into public.sampling_bands (lot_min, lot_max, sample_normal, sample_tightened)
select * from (values
  (1, 15, null::int, null::int), (16, 50, 10, 15), (51, 150, 15, 25), (151, 500, 25, 40),
  (501, 1200, 35, 55), (1201, 3200, 50, 75), (3201, 10000, 65, 100), (10001, null, 80, 125)
) b (lot_min, lot_max, sample_normal, sample_tightened)
where not exists (select 1 from public.sampling_bands where plan_source = 'KHIND');

insert into public.sampling_acceptance (defect_class, ac) values ('critical', 0), ('major', 0), ('minor', 0)
on conflict (plan_source, defect_class) do nothing;
