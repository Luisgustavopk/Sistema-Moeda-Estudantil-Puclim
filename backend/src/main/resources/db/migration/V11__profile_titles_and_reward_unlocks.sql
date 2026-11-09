-- V6 used an unnamed kind CHECK. Resolve its generated name on both supported
-- engines instead of depending on MariaDB/MySQL's different generated names.
SET @reward_kind_check = (
 SELECT c.CONSTRAINT_NAME
 FROM information_schema.CHECK_CONSTRAINTS c
 JOIN information_schema.TABLE_CONSTRAINTS t
   ON t.CONSTRAINT_SCHEMA=c.CONSTRAINT_SCHEMA AND t.CONSTRAINT_NAME=c.CONSTRAINT_NAME
 WHERE t.TABLE_SCHEMA=DATABASE() AND t.TABLE_NAME='profile_rewards'
   AND c.CHECK_CLAUSE LIKE '%AVATAR%' AND c.CHECK_CLAUSE LIKE '%BANNER%'
 LIMIT 1
);
SET @drop_reward_kind_check = CONCAT('ALTER TABLE profile_rewards DROP ',
 IF(VERSION() LIKE '%MariaDB%', 'CONSTRAINT ', 'CHECK '), '`', @reward_kind_check, '`');
PREPARE reward_kind_update FROM @drop_reward_kind_check;
EXECUTE reward_kind_update;
DEALLOCATE PREPARE reward_kind_update;
ALTER TABLE profile_rewards ADD CONSTRAINT ck_reward_kind CHECK (kind IN ('AVATAR','FRAME','BANNER','TITLE'));
ALTER TABLE profile_customizations ADD COLUMN title VARCHAR(40);

CREATE TABLE profile_reward_states (
 student_id VARCHAR(255) PRIMARY KEY,
 initialized_at DATETIME(6) NOT NULL,
 FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB;

CREATE TABLE profile_reward_unlocks (
 id VARCHAR(255) PRIMARY KEY,
 student_id VARCHAR(255) NOT NULL,
 reward_id VARCHAR(64) NOT NULL,
 unlocked_at DATETIME(6) NOT NULL,
 seen_at DATETIME(6),
 UNIQUE (student_id,reward_id),
 FOREIGN KEY (student_id) REFERENCES students(id),
 FOREIGN KEY (reward_id) REFERENCES profile_rewards(id)
) ENGINE=InnoDB;

INSERT INTO profile_rewards
 (id,code,kind,name,rule,required_level,badge_id,icon,palette,variant,sort_order)
VALUES
 ('title-campus-explorer','campus-explorer','TITLE','Explorador do campus','LEVEL',2,NULL,'Compass','TEAL','PLAIN',410),
 ('title-campus-scholar','campus-scholar','TITLE','Estudioso do campus','BADGE',NULL,'COINS_SILVER','BookOpen','TEAL','PLAIN',420),
 ('title-constancy-master','constancy-master','TITLE','Mestre da constância','BADGE',NULL,'STREAK_GOLD','Flame','COPPER','PLAIN',430),
 ('title-solidarity-guardian','solidarity-guardian','TITLE','Guardião solidário','BADGE',NULL,'DONATIONS_GOLD','Heart','FOREST','PLAIN',440),
 ('title-semester-highlight','semester-highlight','TITLE','Destaque do semestre','BADGE',NULL,'TOP_3','Trophy','GOLD','PLAIN',450),
 ('title-advantage-collector','advantage-collector','TITLE','Colecionador de vantagens','BADGE',NULL,'REDEMPTIONS_GOLD','Ticket','TEAL','PLAIN',460),
 ('title-campus-legend','campus-legend','TITLE','Lenda do campus','LEVEL',5,NULL,'Crown','GOLD','PLAIN',470);
