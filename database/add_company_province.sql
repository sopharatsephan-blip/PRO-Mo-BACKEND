USE modul_c3;

ALTER TABLE Company
  ADD COLUMN Province VARCHAR(100) NULL AFTER Location;
