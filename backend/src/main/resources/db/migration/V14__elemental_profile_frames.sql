-- Extend the reusable effect vocabulary; keep existing unlocks and choices.
-- MariaDB and MySQL use different syntax for dropping a CHECK constraint.
SET @drop_frame_motion_check = CONCAT('ALTER TABLE profile_rewards DROP ',
 IF(VERSION() LIKE '%MariaDB%', 'CONSTRAINT ', 'CHECK '), 'ck_reward_motion');
PREPARE frame_motion_update FROM @drop_frame_motion_check;
EXECUTE frame_motion_update;
DEALLOCATE PREPARE frame_motion_update;
ALTER TABLE profile_rewards ADD CONSTRAINT ck_reward_motion
 CHECK (motion IN ('NONE','ORBIT','CROWN','SHIMMER','LIGHTNING','BLACK_HOLE'));

INSERT INTO profile_rewards
 (id,code,kind,name,rule,required_level,icon,palette,variant,sort_order,avatar_shape,motion,cycle_ms)
VALUES
 ('frame-lightning','lightning','FRAME','Núcleo elétrico','LEVEL',4,'Zap','TEAL','PLAIN',180,'CIRCLE','LIGHTNING',8000),
 ('frame-black-hole','black-hole','FRAME','Horizonte de eventos','LEVEL',5,'Orbit','COSMOS','PLAIN',190,'CIRCLE','BLACK_HOLE',16000);
