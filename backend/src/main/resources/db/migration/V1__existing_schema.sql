-- Initial schema for the existing US01-US20 model. Never use this on an unverified legacy database.
CREATE TABLE accounts (
 id VARCHAR(255) PRIMARY KEY, login VARCHAR(40) NOT NULL UNIQUE, email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL, name VARCHAR(100) NOT NULL,
 active BIT NOT NULL, must_change_password BIT NOT NULL, balance BIGINT NOT NULL,
 credential_version BIGINT NOT NULL, version BIGINT NOT NULL,
 CONSTRAINT ck_account_balance CHECK (balance >= 0 AND balance <= 9007199254740991)
) ENGINE=InnoDB;
CREATE TABLE partners (
 id VARCHAR(255) PRIMARY KEY, cnpj VARCHAR(14) NOT NULL UNIQUE, kind VARCHAR(20) NOT NULL,
 phone VARCHAR(20) NOT NULL, description VARCHAR(500) NOT NULL,
 FOREIGN KEY (id) REFERENCES accounts(id)
) ENGINE=InnoDB;
CREATE TABLE students (
 id VARCHAR(255) PRIMARY KEY, cpf VARCHAR(11) NOT NULL UNIQUE, rg VARCHAR(30) NOT NULL,
 address VARCHAR(250) NOT NULL, course VARCHAR(100) NOT NULL, institution_id VARCHAR(255) NOT NULL,
 FOREIGN KEY (id) REFERENCES accounts(id), FOREIGN KEY (institution_id) REFERENCES partners(id)
) ENGINE=InnoDB;
CREATE TABLE teachers (
 id VARCHAR(255) PRIMARY KEY, cpf VARCHAR(11) NOT NULL UNIQUE, department VARCHAR(100) NOT NULL,
 institution_id VARCHAR(255) NOT NULL, FOREIGN KEY (id) REFERENCES accounts(id),
 FOREIGN KEY (institution_id) REFERENCES partners(id)
) ENGINE=InnoDB;
CREATE TABLE advantages (
 id VARCHAR(255) PRIMARY KEY, company_id VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL,
 description VARCHAR(1000) NOT NULL, photo VARCHAR(300) NOT NULL, category VARCHAR(30) NOT NULL,
 cost BIGINT NOT NULL, active BIT NOT NULL, FOREIGN KEY (company_id) REFERENCES partners(id),
 CONSTRAINT ck_advantage_cost CHECK (cost > 0)
) ENGINE=InnoDB;
CREATE TABLE coupons (
 id VARCHAR(255) PRIMARY KEY, advantage_id VARCHAR(255) NOT NULL, student_id VARCHAR(255) NOT NULL,
 company_id VARCHAR(255) NOT NULL, code VARCHAR(40) NOT NULL UNIQUE,
 advantage_name VARCHAR(100) NOT NULL, company_name VARCHAR(100) NOT NULL, student_name VARCHAR(100) NOT NULL,
 cost BIGINT NOT NULL, date DATETIME(6) NOT NULL, status VARCHAR(20) NOT NULL, used_at DATETIME(6),
 FOREIGN KEY (advantage_id) REFERENCES advantages(id), FOREIGN KEY (student_id) REFERENCES students(id),
 FOREIGN KEY (company_id) REFERENCES partners(id), INDEX ix_coupon_student_date (student_id,date)
) ENGINE=InnoDB;
CREATE TABLE ledger_entries (
 id VARCHAR(255) PRIMARY KEY, account_id VARCHAR(255) NOT NULL, kind VARCHAR(20) NOT NULL,
 amount BIGINT NOT NULL, description VARCHAR(1000) NOT NULL, counterpart VARCHAR(100), reason VARCHAR(1000),
 date DATETIME(6) NOT NULL, operation_id VARCHAR(36) NOT NULL, FOREIGN KEY (account_id) REFERENCES accounts(id),
 INDEX ix_ledger_account_date (account_id,date), UNIQUE KEY uk_ledger_operation (account_id,operation_id,kind)
) ENGINE=InnoDB;
CREATE TABLE operations (
 id VARCHAR(255) PRIMARY KEY, account_id VARCHAR(255) NOT NULL, request_key VARCHAR(80) NOT NULL,
 fingerprint VARCHAR(64) NOT NULL, kind VARCHAR(20) NOT NULL, result_id VARCHAR(36) NOT NULL,
 FOREIGN KEY (account_id) REFERENCES accounts(id), UNIQUE KEY uk_operation_request (account_id,request_key)
) ENGINE=InnoDB;
CREATE TABLE semester_credits (
 id VARCHAR(255) PRIMARY KEY, teacher_id VARCHAR(255) NOT NULL, semester VARCHAR(6) NOT NULL,
 date DATETIME(6) NOT NULL, FOREIGN KEY (teacher_id) REFERENCES teachers(id),
 UNIQUE KEY uk_teacher_semester (teacher_id,semester)
) ENGINE=InnoDB;
CREATE TABLE notifications (
 id VARCHAR(255) PRIMARY KEY, account_id VARCHAR(255) NOT NULL, recipient VARCHAR(254) NOT NULL,
 subject VARCHAR(200) NOT NULL, body VARCHAR(5000) NOT NULL, date DATETIME(6) NOT NULL,
 sent_at DATETIME(6), attempts INT NOT NULL, next_attempt DATETIME(6) NOT NULL, last_error VARCHAR(500),
 FOREIGN KEY (account_id) REFERENCES accounts(id), INDEX ix_email_due (sent_at,next_attempt)
) ENGINE=InnoDB;
CREATE TABLE image_assets (
 id VARCHAR(255) PRIMARY KEY, owner_id VARCHAR(255) NOT NULL, filename VARCHAR(100) NOT NULL UNIQUE,
 content_type VARCHAR(40) NOT NULL, FOREIGN KEY (owner_id) REFERENCES accounts(id)
) ENGINE=InnoDB;
