-- Init settings
SET client_encoding TO 'UTF8';
SET datestyle TO DMY;

-- Drop tables
DROP TABLE IF EXISTS activity       CASCADE;
DROP TABLE IF EXISTS address        CASCADE;
DROP TABLE IF EXISTS branch         CASCADE;
DROP TABLE IF EXISTS code           CASCADE;
DROP TABLE IF EXISTS contact        CASCADE;
DROP TABLE IF EXISTS denomination   CASCADE;
DROP TABLE IF EXISTS enterprise     CASCADE;
DROP TABLE IF EXISTS establishment  CASCADE;
DROP TABLE IF EXISTS meta           CASCADE;

-- Recreate tables (same structure)
CREATE TABLE activity (
  EntityNumber       text NOT NULL,
  ActivityGroup      text,
  NaceVersion        integer,
  NaceCode           text,
  Classification     text
);

CREATE TABLE address (
  EntityNumber       text NOT NULL,
  TypeOfAddress      text,
  CountryNL          text,
  CountryFR          text,
  Zipcode            text,
  MunicipalityNL     text,
  MunicipalityFR     text,
  StreetNL           text,
  StreetFR           text,
  HouseNumber        text,
  Box                text,
  ExtraAddressInfo   text,
  DateStrikingOff    date
);

CREATE TABLE branch (
  Id                 text NOT NULL,
  StartDate          date,
  EnterpriseNumber   text
);

CREATE TABLE code (
  Category     text NOT NULL,
  Code         text NOT NULL,
  Language     text,
  Description  text
);

CREATE TABLE contact (
  EntityNumber   text NOT NULL,
  EntityContact  text,
  ContactType    text,
  Value          text
);

CREATE TABLE denomination (
  EntityNumber        text NOT NULL,
  Language            text,
  TypeOfDenomination  text,
  Denomination        text
);

CREATE TABLE enterprise (
  EnterpriseNumber     text NOT NULL,
  Status               text,
  JuridicalSituation   text,
  TypeOfEnterprise     text,
  JuridicalForm        text,
  JuridicalFormCAC     text,
  StartDate            date
);

CREATE TABLE establishment (
  EstablishmentNumber  text NOT NULL,
  StartDate            date,
  EnterpriseNumber     text
);

CREATE TABLE meta (
  Variable   text NOT NULL,
  Value      text
);

-- Primary keys
ALTER TABLE enterprise ADD PRIMARY KEY (EnterpriseNumber);
ALTER TABLE establishment ADD PRIMARY KEY (EstablishmentNumber);
ALTER TABLE code ADD PRIMARY KEY (Category, Code, Language);
ALTER TABLE meta ADD PRIMARY KEY (Variable);

-- Foreign keys
ALTER TABLE establishment
  ADD CONSTRAINT fk_establishment_enterprise
  FOREIGN KEY (EnterpriseNumber)
  REFERENCES enterprise (EnterpriseNumber);

----------------------------------------------------------------------
-- IMPORT ONLY FIRST 100 LINES OF EACH CSV
----------------------------------------------------------------------

-- IMPORT NOTE:
-- head -n 101 = header + 100 lines
----------------------------------------------------------------------

COPY activity
FROM PROGRAM 'head -n 101 /kbo-data/activity.csv'
WITH (FORMAT csv, HEADER true);

COPY address
FROM PROGRAM 'head -n 101 /kbo-data/address.csv'
WITH (FORMAT csv, HEADER true);

COPY branch
FROM PROGRAM 'head -n 101 /kbo-data/branch.csv'
WITH (FORMAT csv, HEADER true);

COPY code
FROM PROGRAM 'head -n 101 /kbo-data/code.csv'
WITH (FORMAT csv, HEADER true);

COPY contact
FROM PROGRAM 'head -n 101 /kbo-data/contact.csv'
WITH (FORMAT csv, HEADER true);

COPY denomination
FROM PROGRAM 'head -n 101 /kbo-data/denomination.csv'
WITH (FORMAT csv, HEADER true);

COPY enterprise
FROM '/kbo-data/enterprise.csv'
WITH (FORMAT csv, HEADER true);

COPY establishment
FROM PROGRAM 'head -n 101 /kbo-data/establishment.csv'
WITH (FORMAT csv, HEADER true);

COPY meta
FROM PROGRAM 'head -n 101 /kbo-data/meta.csv'
WITH (FORMAT csv, HEADER true);
