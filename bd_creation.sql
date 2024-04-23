use master;

go
    create database bank_cw;

go
    use bank_cw;

go
    create table role(
        id int IDENTITY(1, 1) primary key,
        role_name NVARCHAR(200),
        role_privs_level INT,
    );

CREATE TABLE users(
    id int IDENTITY(1, 1) PRIMARY KEY,
    first_name NVARCHAR(200),
    midle_name NVARCHAR(200),
    last_name NVARCHAR(200),
    phone NCHAR(15),
    user_role int FOREIGN KEY REFERENCES role(id)
);

CREATE table account_types(
    id int IDENTITY(1, 1) PRIMARY KEY,
    type_name NVARCHAR(200),
    owner_type int FOREIGN KEY REFERENCES role(id)
);

CREATE TABLE currency(
    id int IDENTITY(1, 1) primary KEY,
    currecy_name NVARCHAR(200),
    currency_short_name NVARCHAR(3)
);

CREATE TABLE currency_convertion(
    pair_id int IDENTITY(1, 1) PRIMARY KEY,
    currncy1 int FOREIGN KEY REFERENCES currency(id),
    currency2 int FOREIGN KEY REFERENCES currency(id),
    ratio FLOAT
) CREATE TABLE accounts(
    id int IDENTITY(1, 1) PRIMARY KEY owner_id int FOREIGN KEY REFERENCES users(id),
    account_type int FOREIGN KEY REFERENCES account_types(id),
    balance money,
    currency int FOREIGN KEY REFERENCES currency(id),
    is_locked BIT
);

CREATE table credit_types(
    id int IDENTITY(1, 1),
    credit_type_name NVARCHAR(200)
);

CREATE table credit_conditions(
    id int IDENTITY(1, 1) PRIMARY KEY,
    credit_name NVARCHAR(200),
    credit_type int FOREIGN KEY REFERENCES credit_types(id),
    percentage_per_year FLOAT,
    max_sum money,
    currency int FOREIGN KEY REFERENCES currency(id)
);

CREATE TABLE deposit_types(
    id int IDENTITY(1, 1) PRIMARY key,
    deposit_type_name NVARCHAR(200),
);

CREATE TABLE deposit_conditioins(
    id int IDENTITY(1, 1) PRIMARY key,
    deposit_condition_name NVARCHAR(200),
    deposit_type int FOREIGN KEY REFERENCES deposit_types(id),
    percentage_per_year FLOAT,
    currency int FOREIGN KEY REFERENCES currency(id)
);

GO