-- Normalize stored emails so login / forgot-password match OTP recipient casing.
UPDATE "User" SET "email" = lower(trim("email"));
