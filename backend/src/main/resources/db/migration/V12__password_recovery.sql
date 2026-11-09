-- Recovery delivery is deliberately separate from the user-visible notification outbox.
-- A plaintext reset token is never persisted, including while SMTP is unavailable.
CREATE TABLE password_reset_requests (
 id VARCHAR(255) PRIMARY KEY,
 account_id VARCHAR(255) NOT NULL,
 recipient VARCHAR(254) NOT NULL,
 credential_version BIGINT NOT NULL,
 token_hash VARCHAR(64) UNIQUE,
 requested_at DATETIME(6) NOT NULL,
 expires_at DATETIME(6) NOT NULL,
 consumed_at DATETIME(6),
 invalidated_at DATETIME(6),
 sent_at DATETIME(6),
 attempts INT NOT NULL DEFAULT 0,
 next_attempt DATETIME(6) NOT NULL,
 last_error VARCHAR(100),
 FOREIGN KEY (account_id) REFERENCES accounts(id),
 INDEX idx_reset_account (account_id),
 INDEX idx_reset_delivery (sent_at,invalidated_at,consumed_at,next_attempt)
) ENGINE=InnoDB;

CREATE TABLE password_reset_rate_limits (
 bucket_key VARCHAR(64) PRIMARY KEY,
 window_end DATETIME(6) NOT NULL,
 attempts INT NOT NULL
) ENGINE=InnoDB;
