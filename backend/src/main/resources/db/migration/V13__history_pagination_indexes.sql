CREATE INDEX ix_ledger_account_kind_date ON ledger_entries (account_id, kind, date, id);
CREATE INDEX ix_coupon_company_date ON coupons (company_id, date, id);
CREATE INDEX ix_coupon_company_status_date ON coupons (company_id, status, date, id);
CREATE INDEX ix_coupon_student_status_date ON coupons (student_id, status, date, id);
