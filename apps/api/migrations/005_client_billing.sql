-- Importe de implementación (pago único), cuota mensual y fecha de
-- renovación del contrato de cada cliente.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS implementation_amount NUMERIC(10,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(10,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS renewal_date DATE;
