-- Add packaging_unit_id foreign key to tbl_prescriptions table
-- This will link prescriptions to the actual packaging units from tbl_medicine_packaging

-- First, add the new column
ALTER TABLE tbl_prescriptions ADD COLUMN packaging_unit_id INT NULL AFTER packaging_unit;

-- Update existing records to link to packaging units based on current packaging_unit values
UPDATE tbl_prescriptions SET packaging_unit_id = 1 WHERE packaging_unit = 'tablet';
UPDATE tbl_prescriptions SET packaging_unit_id = 2 WHERE packaging_unit = 'blister pack';
UPDATE tbl_prescriptions SET packaging_unit_id = 3 WHERE packaging_unit = 'box';
UPDATE tbl_prescriptions SET packaging_unit_id = 4 WHERE packaging_unit = 'bottle';
UPDATE tbl_prescriptions SET packaging_unit_id = 5 WHERE packaging_unit = 'tube';
UPDATE tbl_prescriptions SET packaging_unit_id = 6 WHERE packaging_unit = 'vial';
UPDATE tbl_prescriptions SET packaging_unit_id = 7 WHERE packaging_unit = 'sachet';
UPDATE tbl_prescriptions SET packaging_unit_id = 8 WHERE packaging_unit = 'strip';

-- Add foreign key constraint
ALTER TABLE tbl_prescriptions
ADD CONSTRAINT fk_prescription_packaging_unit
FOREIGN KEY (packaging_unit_id) REFERENCES tbl_medicine_packaging(packaging_id);

-- Make the column NOT NULL after setting values
ALTER TABLE tbl_prescriptions MODIFY COLUMN packaging_unit_id INT NOT NULL;

-- Add index for better performance
CREATE INDEX idx_prescription_packaging_unit ON tbl_prescriptions(packaging_unit_id);

-- Verify the changes
SELECT p.prescription_id, p.packaging_unit, mp.packaging_name, mp.description
FROM tbl_prescriptions p
JOIN tbl_medicine_packaging mp ON p.packaging_unit_id = mp.packaging_id
LIMIT 10;
