-- Additive gamification schema. All financial sources have unique business keys.

CREATE TABLE student_progress (
 id VARCHAR(255) PRIMARY KEY,
 level INT NOT NULL,
 streak INT NOT NULL,
 best_streak INT NOT NULL,
 last_quiz DATE,
 perfect_quiz DATE,
 donation_day DATE,
 FOREIGN KEY (id) REFERENCES students(id)
) ENGINE=InnoDB;

CREATE TABLE level_history (
 id VARCHAR(255) PRIMARY KEY,
 student_id VARCHAR(255) NOT NULL,
 level INT NOT NULL,
 total BIGINT NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (student_id) REFERENCES students(id),
 UNIQUE (student_id,level)
) ENGINE=InnoDB;

CREATE TABLE badge_definitions (
 id VARCHAR(40) PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 description VARCHAR(500) NOT NULL,
 criterion VARCHAR(40) NOT NULL,
 rarity VARCHAR(20) NOT NULL,
 icon VARCHAR(40) NOT NULL,
 target BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE badge_awards (
 id VARCHAR(255) PRIMARY KEY,
 student_id VARCHAR(255) NOT NULL,
 badge_id VARCHAR(255) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (student_id) REFERENCES students(id),
 FOREIGN KEY (badge_id) REFERENCES badge_definitions(id),
 UNIQUE (student_id,badge_id)
) ENGINE=InnoDB;

CREATE TABLE inbox_notifications (
 id VARCHAR(255) PRIMARY KEY,
 account_id VARCHAR(255) NOT NULL,
 type VARCHAR(40) NOT NULL,
 title VARCHAR(200) NOT NULL,
 message VARCHAR(2000) NOT NULL,
 reference_id VARCHAR(255),
 date DATETIME(6),
 read_at DATETIME(6),
 FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

CREATE TABLE quiz_questions (
 id VARCHAR(255) PRIMARY KEY,
 teacher_id VARCHAR(255) NOT NULL,
 prompt VARCHAR(2000) NOT NULL,
 area VARCHAR(100) NOT NULL,
 correct_index INT NOT NULL,
 active BIT NOT NULL,
 FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB;

CREATE TABLE quiz_attempts (
 id VARCHAR(255) PRIMARY KEY,
 student_id VARCHAR(255) NOT NULL,
 day DATE NOT NULL,
 completed_at DATETIME(6),
 correct_count INT NOT NULL,
 streak INT NOT NULL,
 FOREIGN KEY (student_id) REFERENCES students(id),
 UNIQUE (student_id,day)
) ENGINE=InnoDB;

CREATE TABLE quiz_items (
 id VARCHAR(255) PRIMARY KEY,
 attempt_id VARCHAR(255) NOT NULL,
 position INT NOT NULL,
 prompt VARCHAR(2000) NOT NULL,
 area VARCHAR(100) NOT NULL,
 correct_index INT NOT NULL,
 selected_index INT,
 FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id),
 UNIQUE (attempt_id,position)
) ENGINE=InnoDB;

CREATE TABLE missions (
 id VARCHAR(255) PRIMARY KEY,
 teacher_id VARCHAR(255) NOT NULL,
 title VARCHAR(100) NOT NULL,
 description VARCHAR(2000) NOT NULL,
 reward BIGINT NOT NULL,
 capacity INT NOT NULL,
 occupied INT NOT NULL,
 reserved BIGINT NOT NULL,
 deadline DATETIME(6) NOT NULL,
 status VARCHAR(20) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (teacher_id) REFERENCES teachers(id),
 CHECK (reward > 0 AND capacity > 0 AND occupied >= 0 AND occupied <= capacity AND reserved >= 0)
) ENGINE=InnoDB;

CREATE TABLE mission_participations (
 id VARCHAR(255) PRIMARY KEY,
 mission_id VARCHAR(255) NOT NULL,
 student_id VARCHAR(255) NOT NULL,
 status VARCHAR(30) NOT NULL,
 delivery VARCHAR(4000),
 feedback VARCHAR(2000),
 accepted_at DATETIME(6),
 submitted_at DATETIME(6),
 approved_at DATETIME(6),
 FOREIGN KEY (mission_id) REFERENCES missions(id),
 FOREIGN KEY (student_id) REFERENCES students(id),
 UNIQUE (mission_id,student_id)
) ENGINE=InnoDB;

CREATE TABLE mission_reviews (
 id VARCHAR(255) PRIMARY KEY,
 participation_id VARCHAR(255) NOT NULL,
 action VARCHAR(30) NOT NULL,
 text VARCHAR(4000) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (participation_id) REFERENCES mission_participations(id)
) ENGINE=InnoDB;

CREATE TABLE institution_funds (
 id VARCHAR(255) PRIMARY KEY,
 institution_id VARCHAR(255) NOT NULL,
 semester VARCHAR(6) NOT NULL,
 allocation BIGINT NOT NULL,
 balance BIGINT NOT NULL,
 reserved BIGINT NOT NULL,
 origin VARCHAR(500) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (institution_id) REFERENCES partners(id),
 UNIQUE (institution_id,semester),
 CHECK (balance >= 0 AND reserved >= 0 AND allocation > 0)
) ENGINE=InnoDB;

CREATE TABLE fund_movements (
 id VARCHAR(255) PRIMARY KEY,
 fund_id VARCHAR(255) NOT NULL,
 kind VARCHAR(30) NOT NULL,
 amount BIGINT NOT NULL,
 source_key VARCHAR(160) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (fund_id) REFERENCES institution_funds(id),
 UNIQUE (source_key)
) ENGINE=InnoDB;

CREATE TABLE reward_payments (
 id VARCHAR(255) PRIMARY KEY,
 student_id VARCHAR(255) NOT NULL,
 institution_id VARCHAR(255) NOT NULL,
 semester VARCHAR(6) NOT NULL,
 source_key VARCHAR(160) NOT NULL,
 kind VARCHAR(20) NOT NULL,
 amount BIGINT NOT NULL,
 status VARCHAR(20) NOT NULL,
 origin_operation_id VARCHAR(36),
 date DATETIME(6),
 paid_at DATETIME(6),
 FOREIGN KEY (student_id) REFERENCES students(id),
 FOREIGN KEY (institution_id) REFERENCES partners(id),
 UNIQUE (source_key),
 CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE coupon_donations (
 id VARCHAR(255) PRIMARY KEY,
 coupon_id VARCHAR(255) NOT NULL,
 beneficiary_id VARCHAR(255) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (coupon_id) REFERENCES coupons(id),
 FOREIGN KEY (beneficiary_id) REFERENCES partners(id),
 UNIQUE (coupon_id)
) ENGINE=InnoDB;

CREATE TABLE semester_closures (
 id VARCHAR(255) PRIMARY KEY,
 institution_id VARCHAR(255) NOT NULL,
 semester VARCHAR(6) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (institution_id) REFERENCES partners(id),
 UNIQUE (institution_id,semester)
) ENGINE=InnoDB;

CREATE TABLE semester_winners (
 id VARCHAR(255) PRIMARY KEY,
 closure_id VARCHAR(255) NOT NULL,
 student_id VARCHAR(255) NOT NULL,
 position INT NOT NULL,
 received BIGINT NOT NULL,
 streak INT NOT NULL,
 reward BIGINT NOT NULL,
 FOREIGN KEY (closure_id) REFERENCES semester_closures(id),
 FOREIGN KEY (student_id) REFERENCES students(id),
 UNIQUE (closure_id,position),
 UNIQUE (closure_id,student_id)
) ENGINE=InnoDB;

CREATE TABLE sponsored_challenges (
 id VARCHAR(255) PRIMARY KEY,
 company_id VARCHAR(255) NOT NULL,
 title VARCHAR(100) NOT NULL,
 description VARCHAR(2000) NOT NULL,
 reward BIGINT NOT NULL,
 capacity INT NOT NULL,
 budget BIGINT NOT NULL,
 deadline DATETIME(6) NOT NULL,
 status VARCHAR(30) NOT NULL,
 date DATETIME(6),
 FOREIGN KEY (company_id) REFERENCES partners(id),
 CHECK (reward > 0 AND capacity > 0 AND budget >= reward * capacity)
) ENGINE=InnoDB;

CREATE TABLE question_options (question_id VARCHAR(255) NOT NULL, position INT NOT NULL, label VARCHAR(500) NOT NULL, PRIMARY KEY (question_id,position), FOREIGN KEY (question_id) REFERENCES quiz_questions(id)) ENGINE=InnoDB;

CREATE TABLE quiz_item_options (item_id VARCHAR(255) NOT NULL, position INT NOT NULL, label VARCHAR(500) NOT NULL, PRIMARY KEY (item_id,position), FOREIGN KEY (item_id) REFERENCES quiz_items(id)) ENGINE=InnoDB;

CREATE INDEX ix_inbox_account_date ON inbox_notifications(account_id,date);

CREATE INDEX ix_reward_pending ON reward_payments(status,institution_id,semester);

CREATE INDEX ix_mission_deadline ON missions(status,deadline);

INSERT INTO badge_definitions (id,name,description,criterion,rarity,icon,target) VALUES ('FIRST_COIN','Primeira moeda','Receba seu primeiro reconhecimento.','COINS','FACIL','Coins',1);

INSERT INTO badge_definitions (id,name,description,criterion,rarity,icon,target) VALUES ('FIRST_REDEMPTION','Primeiro resgate','Resgate uma vantagem.','REDEMPTIONS','COMUM','Ticket',1);

INSERT INTO badge_definitions (id,name,description,criterion,rarity,icon,target) VALUES ('FIRST_DONATION','Primeira doação','Doe uma vantagem.','DONATIONS','RARA','Heart',1);

INSERT INTO badge_definitions (id,name,description,criterion,rarity,icon,target) VALUES ('STREAK_7','Uma semana de constância','Conclua sete quizzes consecutivos.','STREAK','EPICA','Flame',7);

INSERT INTO badge_definitions (id,name,description,criterion,rarity,icon,target) VALUES ('TOP_3','Destaque do semestre','Termine entre os três primeiros da instituição.','TOP3','LENDARIA','Trophy',1);
