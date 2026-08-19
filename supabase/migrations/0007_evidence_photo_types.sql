-- ===========================================================================
-- Acres dMRV — 0007 · Additional run-evidence photo types
-- Client request (slide 3): capture moisture-reading, biochar-weight, biochar
-- and biomass photos alongside the required process photos. These extra photos
-- are also the inputs the computer-vision path (Pipeline B) reads to estimate
-- biochar mass and moisture.
--
-- NOTE: `alter type … add value` cannot be used in the same transaction that
-- adds it, so this migration ONLY adds enum values — nothing references them
-- here. The application uses them at runtime.
-- ===========================================================================

alter type photo_type add value if not exists 'moisture_reading';
alter type photo_type add value if not exists 'biochar_weight';
alter type photo_type add value if not exists 'biochar_sample';
alter type photo_type add value if not exists 'biomass_feedstock';
