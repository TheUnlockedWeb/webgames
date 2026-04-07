# Brawl Tracker  

- It is a web application that utilizes the Brawl Stars API to track and monitor player statistics in the popular mobile game. 

## Table of contents 
* [Website Features](#website-features)
* [Technology Used](#technology-used)
* [How to Install](#how-to-install-run)
* [How to Run](#how-to-install-run)

## Website Features  

> You can view the daily Brawl Stars **events**, see a **list of all brawlers** and most importantly **watch your stats** and the stats of other players. 

- There is also an opportunity to register, so you will get new features and additional information about the statistics of the players. 

## Technology Used

### APIs 

> The third-party [BrawlAPI](https://brawlapi.com/#/) and the official [Brawl Stars API](https://developer.brawlstars.com/#/), which you must connect to via a generated token.  

- I use the [BrawlAPI](https://brawlapi.com/#/) as the main one.
	- Since it has advanced functions. 
	- On the web page it is responsible for: events, brawlers and most importantly icons or images that are not in the official API. 
- The official [Brawl Stars API](https://developer.brawlstars.com/#/) is only responsible for player statistics.
	- You will not have access to this API because the token is associated with an IP address. 
	- If you want to use it, you need to create an [account](https://developer.brawlstars.com/#/register).

### Frontend

> HTML, CSS, JS, (BrawlAPI)
#### Backend

> PHP, MySQL, (Brawl Stars API)

### Libraries

- [Bootstrap v5.3](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
- [jQuery v3.7.0](https://blog.jquery.com/2023/05/11/jquery-3-7-0-released-staying-in-order/)
- [Popper v2.11.8](https://popper.js.org/docs/v2/)

## How to Install (Run)

### Table of branches

* [front-end](#front-end)
* [back-end](#back-end)

#### front-end

> Need to install editor: e.g [Visual Studio Code](https://code.visualstudio.com/).
 1. Download from github **front-end** branch.
 2. Extract and then open in the editor.

#### back-end

> Need to install editor: e.g [Visual Studio Code](https://code.visualstudio.com/), [XAMPP](https://www.apachefriends.org/download.html) and [MySQL](https://www.mysql.com/downloads/).

 1. Download [release](https://github.com/RostaJecna/brawl-stars-web-tracker/releases) or **back-end** branch from github.

 2. If you want access to player statistics, you must create an account on the [Brawl Stars API](https://developer.brawlstars.com/#/register).
	- Generate [token](https://developer.brawlstars.com/#/new-key) and past inside `/assets/php/extensions/api-request.php`.
 3. Otherwise remove this check condition inside `/assets/php/extensions/user-manager.php`.
	- Function name `trySignup(...);`.
```php
if (!ApiRequest::isPlayerExisting($player_tag)) {
	$_SESSION["AUTHENTICATION_STATUS"] = "Failed to get the player's data. Check that his tag is written correctly.";
	header("Location: /");
	return;
} 
```

 4. Open **XAMPP** configuration and set branch directory.
	-	*Or place to default folder.*

 5. Open **MySQL** and paste the following query selectors:

```sql
create database brawl_tracker;
use brawl_tracker;

create table `profile` (
    id int primary key auto_increment,
    email varchar(45) not null unique,
    `password` varchar(64) not null,
    tag varchar(9) not null,
    
    constraint check_email_format check (email like '%@%'),
    constraint check_tag_format check (tag regexp '^[A-Za-z0-9]+$')
);
```
