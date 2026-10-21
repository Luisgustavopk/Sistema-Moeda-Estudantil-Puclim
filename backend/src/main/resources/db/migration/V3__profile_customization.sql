ALTER TABLE students MODIFY COLUMN rg VARCHAR(30) NULL;

CREATE TABLE profile_customizations (
 student_id VARCHAR(255) PRIMARY KEY,
 display_name VARCHAR(40) NOT NULL, bio VARCHAR(240) NOT NULL,
 show_real_name BIT NOT NULL, avatar VARCHAR(300) NOT NULL,
 frame VARCHAR(20) NOT NULL, banner VARCHAR(20) NOT NULL,
 featured_badge_ids VARCHAR(500) NOT NULL, favorite_badge_id VARCHAR(255),
 visibility VARCHAR(20) NOT NULL, show_stats BIT NOT NULL, show_activity BIT NOT NULL,
 FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB;

CREATE TABLE profile_avatars (
 id VARCHAR(36) PRIMARY KEY, student_id VARCHAR(255) NOT NULL,
 content LONGBLOB NOT NULL,
 FOREIGN KEY (student_id) REFERENCES students(id), INDEX ix_avatar_student (student_id)
) ENGINE=InnoDB;
