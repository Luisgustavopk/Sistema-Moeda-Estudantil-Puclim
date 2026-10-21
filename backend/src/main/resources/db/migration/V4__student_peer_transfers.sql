CREATE TABLE teacher_student_links (
 id VARCHAR(36) PRIMARY KEY,
 teacher_id VARCHAR(255) NOT NULL,
 student_id VARCHAR(255) NOT NULL,
 active BIT NOT NULL,
 FOREIGN KEY (teacher_id) REFERENCES teachers(id),
 FOREIGN KEY (student_id) REFERENCES students(id),
 UNIQUE KEY uk_teacher_student (teacher_id, student_id),
 INDEX ix_link_student (student_id, active)
) ENGINE=InnoDB;

CREATE TABLE peer_transfer_policies (
 teacher_id VARCHAR(255) PRIMARY KEY,
 criteria VARCHAR(2000) NOT NULL,
 FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB;

CREATE TABLE peer_transfer_requests (
 id VARCHAR(36) PRIMARY KEY,
 teacher_id VARCHAR(255) NOT NULL,
 sender_id VARCHAR(255) NOT NULL,
 recipient_id VARCHAR(255) NOT NULL,
 amount BIGINT NOT NULL,
 reason VARCHAR(1000) NOT NULL,
 criteria VARCHAR(2000) NOT NULL,
 request_key VARCHAR(80) NOT NULL,
 status VARCHAR(20) NOT NULL,
 feedback VARCHAR(1000),
 created_at DATETIME(6) NOT NULL,
 reviewed_at DATETIME(6),
 FOREIGN KEY (teacher_id) REFERENCES teachers(id),
 FOREIGN KEY (sender_id) REFERENCES students(id),
 FOREIGN KEY (recipient_id) REFERENCES students(id),
 UNIQUE KEY uk_peer_request (sender_id, request_key),
 INDEX ix_peer_teacher (teacher_id, status, created_at),
 INDEX ix_peer_recipient (recipient_id, created_at),
 CONSTRAINT ck_peer_amount CHECK (amount > 0 AND amount <= 9007199254740991),
 CONSTRAINT ck_peer_distinct CHECK (sender_id <> recipient_id),
 CONSTRAINT ck_peer_status CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA'))
) ENGINE=InnoDB;
