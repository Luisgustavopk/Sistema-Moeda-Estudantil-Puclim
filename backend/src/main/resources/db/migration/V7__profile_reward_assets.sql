-- Artwork is independent of rules and reward codes. Public catalog assets are
-- served with the frontend; personal avatar uploads retain their existing ACL.
ALTER TABLE profile_rewards
 ADD COLUMN asset_path VARCHAR(300),
 ADD COLUMN avatar_inset INT NOT NULL DEFAULT 12,
 ADD COLUMN avatar_shape VARCHAR(20) NOT NULL DEFAULT 'ROUNDED',
 ADD CONSTRAINT ck_reward_asset_path CHECK (asset_path IS NULL OR asset_path LIKE '/images/rewards/%'),
 ADD CONSTRAINT ck_reward_avatar_inset CHECK (avatar_inset BETWEEN 0 AND 35),
 ADD CONSTRAINT ck_reward_avatar_shape CHECK (avatar_shape IN ('ROUNDED','CIRCLE','SQUARE'));
