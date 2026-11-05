ALTER TABLE profile_rewards
 ADD COLUMN banner_motion VARCHAR(20) NOT NULL DEFAULT 'NONE',
 ADD CONSTRAINT ck_reward_banner_motion CHECK (banner_motion IN ('NONE','AURORA','METEORS','WAVES')),
 ADD CONSTRAINT ck_reward_banner_kind CHECK (kind='BANNER' OR banner_motion='NONE'),
 ADD CONSTRAINT ck_reward_banner_cycle CHECK (banner_motion='NONE' OR cycle_ms BETWEEN 8000 AND 20000);

INSERT INTO profile_rewards
 (id,code,kind,name,rule,required_level,badge_id,icon,palette,variant,sort_order,banner_motion,cycle_ms)
VALUES
 ('banner-aurora','aurora','BANNER','Aurora do campus','LEVEL',3,NULL,'Sparkles','TEAL','PLAIN',290,'AURORA',14000),
 ('banner-meteors','meteors','BANNER','Chuva de meteoros','BADGE',NULL,'STREAK_GOLD','Rocket','COSMOS','PLAIN',300,'METEORS',12000),
 ('banner-golden-waves','golden-waves','BANNER','Ondas douradas','LEVEL',5,NULL,'Waves','GOLD','PLAIN',310,'WAVES',16000);
