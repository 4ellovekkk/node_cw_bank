use bank_cw;
go
INSERT INTO account_types (type_name, owner_type)
VALUES ('Personal Account', 1),
       ('Business Account', 2),
       ('Savings Account', 3);

-- Заполнение таблицы currency
INSERT INTO currency (currecy_name, currency_short_name)
VALUES ('US Dollar', 'USD'),
       ('Euro', 'EUR'),
       ('British Pound', 'GBP'),
       ('Japanese Yen', 'JPY');

-- Заполнение таблицы currency_convertion
INSERT INTO currency_convertion (currncy1, currency2, ratio)
VALUES (1, 2, 0.83), -- USD to EUR
       (1, 3, 0.72), -- USD to GBP
       (1, 4, 109.35), -- USD to JPY
       (2, 1, 1.21), -- EUR to USD
       (2, 3, 0.86), -- EUR to GBP
       (2, 4, 130.42), -- EUR to JPY
       (3, 1, 1.39), -- GBP to USD
       (3, 2, 1.16), -- GBP to EUR
       (3, 4, 151.52), -- GBP to JPY
       (4, 1, 0.0091), -- JPY to USD
       (4, 2, 0.0077), -- JPY to EUR
       (4, 3, 0.0066); -- JPY to GBP

-- Заполнение таблицы credit_types
INSERT INTO credit_types (credit_type_name)
VALUES ('Personal Loan'),
       ('Business Loan'),
       ('Mortgage');

-- Заполнение таблицы credit_conditions
INSERT INTO credit_conditions (credit_name, credit_type, percentage_per_year, max_sum, currency)
VALUES ('Personal Loan Condition 1', 1, 10.5, 100000.00, 1),
       ('Personal Loan Condition 2', 1, 9.8, 50000.00, 2),
       ('Business Loan Condition 1', 2, 8.2, 500000.00, 1),
       ('Business Loan Condition 2', 2, 7.5, 200000.00, 2),
       ('Mortgage Condition 1', 3, 4.5, 300000.00, 1),
       ('Mortgage Condition 2', 3, 3.8, 150000.00, 2);

-- Заполнение таблицы deposit_types
INSERT INTO deposit_types (deposit_type_name)
VALUES ('Fixed Deposit'),
       ('Recurring Deposit');

-- Заполнение таблицы deposit_conditioins
INSERT INTO deposit_conditioins (deposit_condition_name, deposit_type, percentage_per_year, currency)
VALUES ('Fixed Deposit Condition 1', 1, 6.5, 1),
       ('Fixed Deposit Condition 2', 1, 5.8, 2),
       ('Recurring Deposit Condition 1', 2, 5.2, 1),
       ('Recurring Deposit Condition 2', 2, 4.6, 2);
