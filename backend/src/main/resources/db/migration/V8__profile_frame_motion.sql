ALTER TABLE profile_rewards
 ADD COLUMN motion VARCHAR(20) NOT NULL DEFAULT 'NONE',
 ADD COLUMN cycle_ms INT NOT NULL DEFAULT 4000,
 ADD CONSTRAINT ck_reward_motion CHECK (motion IN ('NONE','ORBIT','CROWN','SHIMMER')),
 ADD CONSTRAINT ck_reward_cycle CHECK (cycle_ms BETWEEN 1200 AND 20000),
 ADD CONSTRAINT ck_reward_motion_kind CHECK (kind='FRAME' OR motion='NONE');

UPDATE profile_rewards SET motion='SHIMMER' WHERE id='frame-merit';
UPDATE profile_rewards SET motion='CROWN', icon='Crown', cycle_ms=2400 WHERE id='frame-gold';
UPDATE profile_rewards SET motion='ORBIT' WHERE id='frame-constancy';
INSERT INTO profile_rewards (id,code,kind,name,rule,required_level,icon,palette,variant,sort_order,motion)
 VALUES ('frame-orbit','orbit','FRAME','Órbita de mérito','LEVEL',4,'Sparkles','TEAL','PLAIN',155,'ORBIT');
