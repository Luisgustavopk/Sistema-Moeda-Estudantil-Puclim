CREATE TABLE profile_rewards (
 id VARCHAR(64) PRIMARY KEY,
 code VARCHAR(40) NOT NULL,
 kind VARCHAR(20) NOT NULL,
 name VARCHAR(100) NOT NULL,
 rule VARCHAR(20) NOT NULL,
 required_level INT,
 badge_id VARCHAR(40),
 icon VARCHAR(40),
 palette VARCHAR(20) NOT NULL,
 variant VARCHAR(20) NOT NULL,
 sort_order INT NOT NULL,
 UNIQUE (kind,code),
 FOREIGN KEY (badge_id) REFERENCES badge_definitions(id),
 CHECK (kind IN ('AVATAR','FRAME','BANNER')),
 CHECK (rule IN ('DEFAULT','LEVEL','BADGE','ANY_BADGE')),
 CHECK ((rule='LEVEL' AND required_level IS NOT NULL AND required_level >= 1 AND badge_id IS NULL)
     OR (rule='BADGE' AND badge_id IS NOT NULL AND required_level IS NULL)
     OR (rule IN ('DEFAULT','ANY_BADGE') AND required_level IS NULL AND badge_id IS NULL)),
 CHECK (palette IN ('PETROLEUM','CREAM','GOLD','BRONZE','SILVER','FOREST','COSMOS','COPPER','TEAL')),
 CHECK (variant IN ('PLAIN','DOUBLE'))
) ENGINE=InnoDB;

ALTER TABLE profile_customizations MODIFY COLUMN frame VARCHAR(40) NOT NULL, MODIFY COLUMN banner VARCHAR(40) NOT NULL;

INSERT INTO profile_rewards (id,code,kind,name,rule,required_level,badge_id,icon,palette,variant,sort_order) VALUES
 ('avatar-initials','initials','AVATAR','Iniciais','DEFAULT',NULL,NULL,'Initials','PETROLEUM','PLAIN',10),
 ('avatar-graduate','graduate','AVATAR','Formatura','DEFAULT',NULL,NULL,'GraduationCap','PETROLEUM','PLAIN',20),
 ('avatar-portrait','portrait','AVATAR','Ilustração','DEFAULT',NULL,NULL,'Portrait','PETROLEUM','PLAIN',30),
 ('avatar-explorer','explorer','AVATAR','Explorador','LEVEL',2,NULL,'Compass','PETROLEUM','PLAIN',40),
 ('avatar-scholar','scholar','AVATAR','Estudioso','BADGE',NULL,'STREAK_SILVER','BookOpen','GOLD','PLAIN',50),
 ('avatar-guardian','guardian','AVATAR','Guardião','BADGE',NULL,'FIRST_DONATION','Sprout','FOREST','PLAIN',60),
 ('avatar-astronaut','astronaut','AVATAR','Astronauta','LEVEL',4,NULL,'Rocket','COSMOS','PLAIN',70),
 ('avatar-laureate','laureate','AVATAR','Laureado','BADGE',NULL,'TOP_3','Trophy','GOLD','PLAIN',80),
 ('frame-classic','classic','FRAME','Clássica','DEFAULT',NULL,NULL,NULL,'PETROLEUM','PLAIN',110),
 ('frame-merit','merit','FRAME','Mérito','ANY_BADGE',NULL,NULL,'Award','GOLD','PLAIN',120),
 ('frame-bronze','bronze','FRAME','Bronze','LEVEL',2,NULL,'Award','BRONZE','PLAIN',130),
 ('frame-silver','silver','FRAME','Prata','LEVEL',3,NULL,'Award','SILVER','PLAIN',140),
 ('frame-gold','gold','FRAME','Ouro','LEVEL',5,NULL,'Trophy','GOLD','DOUBLE',150),
 ('frame-constancy','constancy','FRAME','Chama da constância','BADGE',NULL,'STREAK_7','Flame','COPPER','PLAIN',160),
 ('frame-solidarity','solidarity','FRAME','Laços solidários','BADGE',NULL,'DONATIONS_GOLD','Heart','FOREST','PLAIN',170),
 ('frame-redeemer','redeemer','FRAME','Colecionador','BADGE',NULL,'REDEMPTIONS_GOLD','Ticket','TEAL','DOUBLE',180),
 -- Preserve the three existing backgrounds as defaults.
 ('banner-petroleum','petroleum','BANNER','Petróleo','DEFAULT',NULL,NULL,NULL,'PETROLEUM','PLAIN',210),
 ('banner-cream','cream','BANNER','Creme','DEFAULT',NULL,NULL,NULL,'CREAM','PLAIN',220),
 ('banner-gold','gold','BANNER','Ouro','DEFAULT',NULL,NULL,NULL,'GOLD','PLAIN',230),
 ('banner-library','library','BANNER','Biblioteca','BADGE',NULL,'COINS_SILVER','BookOpen','TEAL','PLAIN',240),
 ('banner-garden','garden','BANNER','Jardim solidário','BADGE',NULL,'DONATIONS_SILVER','Sprout','FOREST','PLAIN',250),
 ('banner-cosmos','cosmos','BANNER','Cosmos','LEVEL',4,NULL,'Orbit','COSMOS','PLAIN',260),
 ('banner-constellation','constellation','BANNER','Constelação','BADGE',NULL,'STREAK_GOLD','Sparkles','COSMOS','PLAIN',270),
 ('banner-laurels','laurels','BANNER','Galeria de louros','BADGE',NULL,'TOP3_GOLD','Trophy','GOLD','PLAIN',280);
