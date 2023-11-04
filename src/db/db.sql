CREATE TABLE Users (
    id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    firstName varchar(32),
    lastName varchar(32),
    email varchar(64),
    hash varchar(255),
    updatedAt datetime,
    createdAt datetime,
    UNIQUE (email)
);

CREATE TABLE Tokens (
    id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    userId int,
    refreshToken varchar(250),
    expiresIn varchar(64),
    updatedAt datetime,
    createdAt datetime,
    FOREIGN KEY (userId) REFERENCES Users(id)
);