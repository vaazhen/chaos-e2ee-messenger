-- Hibernate used to INSERT without object_key after V40 made it NOT NULL.
-- Fill missing values on write so uploads stop failing with 409.

CREATE OR REPLACE FUNCTION encrypted_attachments_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.object_key IS NULL OR btrim(NEW.object_key) = '' THEN
    NEW.object_key := NEW.attachment_id;
  END IF;
  IF NEW.storage_backend IS NULL OR btrim(NEW.storage_backend) = '' THEN
    NEW.storage_backend := 'LOCAL';
  END IF;
  IF NEW.status IS NULL OR btrim(NEW.status) = '' THEN
    NEW.status := 'READY';
  END IF;
  IF NEW.version IS NULL THEN
    NEW.version := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypted_attachments_defaults ON encrypted_attachments;
CREATE TRIGGER trg_encrypted_attachments_defaults
  BEFORE INSERT OR UPDATE ON encrypted_attachments
  FOR EACH ROW
  EXECUTE FUNCTION encrypted_attachments_defaults();
