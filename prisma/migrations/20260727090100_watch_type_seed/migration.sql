-- Internationally recognized watch/intelligence categories
INSERT INTO "reference_entities" ("id","type","name","code","sortOrder","metadata","aliases","updatedAt") VALUES
('watch-strategic','WATCH_TYPE','Veille stratégique','STRATEGIC',1,'{"icon":"📈"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-commercial','WATCH_TYPE','Veille commerciale','COMMERCIAL',2,'{"icon":"💼"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-competitive','WATCH_TYPE','Veille concurrentielle','COMPETITIVE',3,'{"icon":"🏢"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-product','WATCH_TYPE','Veille produits','PRODUCT',4,'{"icon":"💊"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-scientific','WATCH_TYPE','Veille scientifique et médicale','SCIENTIFIC_MEDICAL',5,'{"icon":"🧪"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-regulatory','WATCH_TYPE','Veille réglementaire','REGULATORY',6,'{"icon":"⚖️"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-technology','WATCH_TYPE','Veille technologique','TECHNOLOGY',7,'{"icon":"💻"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-digital','WATCH_TYPE','Veille digitale','DIGITAL',8,'{"icon":"🌐"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-marketing','WATCH_TYPE','Veille marketing','MARKETING',9,'{"icon":"📢"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-logistics','WATCH_TYPE','Veille logistique','LOGISTICS',10,'{"icon":"📦"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-pricing','WATCH_TYPE','Veille tarifaire','PRICING',11,'{"icon":"💰"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-partnership','WATCH_TYPE','Veille partenariale','PARTNERSHIP',12,'{"icon":"🤝"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-risk','WATCH_TYPE','Veille des risques','RISK',13,'{"icon":"⚠️"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-international','WATCH_TYPE','Veille internationale','INTERNATIONAL',14,'{"icon":"🌍"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP),
('watch-other','WATCH_TYPE','Autre','OTHER',15,'{"icon":"📝"}',ARRAY[]::TEXT[],CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
