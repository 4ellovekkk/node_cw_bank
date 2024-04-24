use master;

go
    create database bank_cw;

go
;

use bank_cw;

create table role(
    id int IDENTITY(1, 1) primary key,
    role_name NVARCHAR(200),
    role_privs_level INT
);

CREATE TABLE users(
    id int IDENTITY(1, 1) PRIMARY KEY,
    first_name NVARCHAR(200),
    midle_name NVARCHAR(200),
    last_name NVARCHAR(200),
    phone NCHAR(15),
    user_role int FOREIGN KEY REFERENCES role(id) on delete cascade on update CASCADE,
    username VARCHAR(200),
    passwd VARCHAR(255)
);

CREATE table account_types(
    id int IDENTITY(1, 1) PRIMARY KEY,
    type_name NVARCHAR(200),
    owner_type int FOREIGN KEY REFERENCES role(id) on delete cascade on update cascade
);

CREATE TABLE currency(
    id int IDENTITY(1, 1) primary KEY,
    currecy_name NVARCHAR(200),
    currency_short_name NVARCHAR(3)
);

CREATE TABLE currency_convertion(
    pair_id int IDENTITY(1, 1) PRIMARY KEY,
    currncy1 int FOREIGN KEY REFERENCES currency(id) on delete no ACTION on update no ACTION,
    currency2 int FOREIGN KEY REFERENCES currency(id) on delete no action on update no action,
    ratio FLOAT
);

CREATE TABLE accounts(
    id int IDENTITY(1, 1) PRIMARY KEY,
    owner_id int FOREIGN KEY REFERENCES users(id) on delete no action on update no action,
    account_type int FOREIGN KEY REFERENCES account_types(id) on delete no ACTION on update no ACTION,
    balance money,
    currency int FOREIGN KEY REFERENCES currency(id) on delete no ACTION on update no ACTION,
    is_locked BIT
);

CREATE table credit_types(
    id int IDENTITY(1, 1) primary key,
    credit_type_name NVARCHAR(200)
);

CREATE table credit_conditions(
    id int IDENTITY(1, 1) PRIMARY KEY,
    credit_name NVARCHAR(200),
    credit_type int FOREIGN KEY REFERENCES credit_types(id) on delete cascade on update cascade,
    percentage_per_year FLOAT,
    max_sum money,
    currency int FOREIGN KEY REFERENCES currency(id) on delete cascade on update cascade
);

CREATE TABLE deposit_types(
    id int IDENTITY(1, 1) PRIMARY key,
    deposit_type_name NVARCHAR(200),
);

CREATE TABLE deposit_conditioins(
    id int IDENTITY(1, 1) PRIMARY key,
    deposit_condition_name NVARCHAR(200),
    deposit_type int FOREIGN KEY REFERENCES deposit_types(id) on delete cascade on update cascade,
    percentage_per_year FLOAT,
    currency int FOREIGN KEY REFERENCES currency(id)
);

CREATE TABLE action_types(
    id int IDENTITY(1, 1) PRIMARY KEY,
    action_name NVARCHAR(200),
);

CREATE TABLE operation_log (
    id INT IDENTITY(1, 1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(id) on update cascade,
    account_id int FOREIGN key REFERENCES accounts(id) on update cascade,
    table_name NVARCHAR(200),
    action_time DATETIME DEFAULT GETDATE(),
    additional_info NVARCHAR(MAX)
);

GO
;

-------------------------------------------------------cascade triggers-------------------------------------------------------
CREATE TRIGGER trg_currency_convertion_delete ON currency
AFTER
    DELETE AS BEGIN
DELETE FROM
    currency_convertion
WHERE
    currncy1 IN (
        SELECT
            id
        FROM
            deleted
    )
    OR currency2 IN (
        SELECT
            id
        FROM
            deleted
    );

END;

go
;

CREATE TRIGGER trg_currency_convertion_update ON currency
AFTER
UPDATE
    AS BEGIN
UPDATE
    currency_convertion
SET
    currncy1 = inserted.id
FROM
    inserted
WHERE
    currency_convertion.currncy1 = inserted.id;

UPDATE
    currency_convertion
SET
    currency2 = inserted.id
FROM
    inserted
WHERE
    currency_convertion.currency2 = inserted.id;

END;

go
;

CREATE TRIGGER trg_accounts_delete ON users
AFTER
    DELETE AS BEGIN
DELETE FROM
    accounts
WHERE
    owner_id IN (
        SELECT
            id
        FROM
            deleted
    );

END;

go
;

CREATE TRIGGER trg_accounts_delete_account_types ON account_types
AFTER
    DELETE AS BEGIN
DELETE FROM
    accounts
WHERE
    account_type IN (
        SELECT
            id
        FROM
            deleted
    );

END;

go
;

CREATE TRIGGER trg_accounts_delete_currency ON currency
AFTER
    DELETE AS BEGIN
DELETE FROM
    accounts
WHERE
    currency IN (
        SELECT
            id
        FROM
            deleted
    );

END;

go
    CREATE TRIGGER trg_accounts_update ON users
AFTER
UPDATE
    AS BEGIN
UPDATE
    accounts
SET
    owner_id = inserted.id
FROM
    inserted
WHERE
    accounts.owner_id = inserted.id;

END;

go
;

CREATE TRIGGER trg_accounts_update_account_types ON account_types
AFTER
UPDATE
    AS BEGIN
UPDATE
    accounts
SET
    account_type = inserted.id
FROM
    inserted
WHERE
    accounts.account_type = inserted.id;

END;

go
;

CREATE TRIGGER trg_accounts_update_currency ON currency
AFTER
UPDATE
    AS BEGIN
UPDATE
    accounts
SET
    currency = inserted.id
FROM
    inserted
WHERE
    accounts.currency = inserted.id;

END;

GO
    -----------------------------------------------------log table triggers--------------------------------------------------------------------