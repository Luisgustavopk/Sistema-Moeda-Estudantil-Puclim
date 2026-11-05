ALTER TABLE profile_avatars
    ADD COLUMN content_type VARCHAR(40) NOT NULL DEFAULT 'image/png',
    ADD COLUMN static_content LONGBLOB NULL;
