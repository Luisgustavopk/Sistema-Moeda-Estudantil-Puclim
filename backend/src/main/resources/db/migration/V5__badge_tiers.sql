-- Preserve existing IDs, awards, dates and profile showcases. Original medals
-- become the bronze step; subsequent steps use the same verified metrics.
ALTER TABLE badge_definitions
 ADD COLUMN family VARCHAR(40),
 ADD COLUMN tier VARCHAR(10);

UPDATE badge_definitions SET family='RECOGNITION', tier='BRONZE' WHERE id='FIRST_COIN';
UPDATE badge_definitions SET family='REDEMPTIONS', tier='BRONZE' WHERE id='FIRST_REDEMPTION';
UPDATE badge_definitions SET family='DONATIONS', tier='BRONZE' WHERE id='FIRST_DONATION';
UPDATE badge_definitions SET family='STREAK', tier='BRONZE' WHERE id='STREAK_7';
UPDATE badge_definitions SET family='TOP3', tier='BRONZE' WHERE id='TOP_3';

INSERT INTO badge_definitions (id,name,description,criterion,rarity,icon,target,family,tier) VALUES
 ('COINS_SILVER','Reconhecimento · Prata','Acumule 100 moedas em recebimentos elegíveis ao longo da trajetória.','COINS','RARA','Coins',100,'RECOGNITION','SILVER'),
 ('COINS_GOLD','Reconhecimento · Ouro','Acumule 1.000 moedas em recebimentos elegíveis ao longo da trajetória.','COINS','EPICA','Coins',1000,'RECOGNITION','GOLD'),
 ('REDEMPTIONS_SILVER','Resgates · Prata','Resgate cinco vantagens. Cada cupom emitido conta uma vez.','REDEMPTIONS','RARA','Ticket',5,'REDEMPTIONS','SILVER'),
 ('REDEMPTIONS_GOLD','Resgates · Ouro','Resgate quinze vantagens. Cada cupom emitido conta uma vez.','REDEMPTIONS','EPICA','Ticket',15,'REDEMPTIONS','GOLD'),
 ('DONATIONS_SILVER','Solidariedade · Prata','Doe três cupons a beneficiárias. Cada doação confirmada conta uma vez.','DONATIONS','EPICA','Heart',3,'DONATIONS','SILVER'),
 ('DONATIONS_GOLD','Solidariedade · Ouro','Doe dez cupons a beneficiárias. Cada doação confirmada conta uma vez.','DONATIONS','LENDARIA','Heart',10,'DONATIONS','GOLD'),
 ('STREAK_SILVER','Constância · Prata','Conclua quizzes em quatorze dias consecutivos. Vale seu melhor recorde.','STREAK','EPICA','Flame',14,'STREAK','SILVER'),
 ('STREAK_GOLD','Constância · Ouro','Conclua quizzes em trinta dias consecutivos. Vale seu melhor recorde.','STREAK','LENDARIA','Flame',30,'STREAK','GOLD'),
 ('TOP3_SILVER','Destaque · Prata','Termine entre os três primeiros da instituição em dois semestres.','TOP3','LENDARIA','Trophy',2,'TOP3','SILVER'),
 ('TOP3_GOLD','Destaque · Ouro','Termine entre os três primeiros da instituição em três semestres.','TOP3','LENDARIA','Trophy',3,'TOP3','GOLD');
