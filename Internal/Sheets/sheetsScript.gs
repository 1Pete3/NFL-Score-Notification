/////////////////////////////////////////////////////////////////////////////////////////////
// Author: Ryan Buckner
// Date:   02/2023
// Updated: 08/08/2024 by ryanbuckner
// Usage:  Free and Open
/////////////////////////////////////////////////////////////////////////////////////////////

// using sets the timezone equal to the timezone in the sheet settings
var TIMEZONE = Session.getScriptTimeZone();
var oddsDict = getOddsDict();
var datesPlayed = [];

// change this year to use for a new season
const SEASON_YEAR = '2024';
const PRESEASON_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=1&dates=';
const REGSEASON_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&dates=';
const POSTSEASON_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=3&dates=';
const STATISTICS_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=';
// API error trapping
options = {
  muteHttpExceptions: true,
};

// the main function drives the show - if you need a button tie it to this
function main() {
  sheetData = allgames();
  writeToSheet(sheetData);
}

// pull the odds so they are preserved
function readOldOdds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Live Scoring');
  var range = sheet.getRange(2, 17, sheet.getLastRow() - 1, 3);
  var values = range.getValues();

  return values;
}

function getOddsDict() {
  var games = readOldOdds();
  var gamesDict = {};

  games.forEach(function (value) {
    gamesDict[value[0]] = [value[1], value[2]];
  });

  return gamesDict;
}

function getTotalYardsByTeamId(jsonData, teamId) {
  const teams = jsonData.boxscore.teams;
  for (let i = 0; i < teams.length; i++) {
    if (teams[i].team.id == teamId) {
      const statistics = teams[i].statistics;
      for (let j = 0; j < statistics.length; j++) {
        if (statistics[j].name === 'totalYards') {
          return statistics[j].displayValue;
        }
      }
    }
  }
  return null; // return null if the teamId or totalYards is not found
}

// use this to write the info to the sheet
function writeToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Live Scoring');
  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);

  // write an update timestamp so the user knows how recent the data is
  var now = new Date();
  var timestamp = Utilities.formatDate(now, TIMEZONE, 'E hh:mm a');
  sheet.getRange('A1').setValue(timestamp);

  // Sort the Live Scoring sheet by date so it's easier to read
  let range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  range.sort({
    column: 2,
    ascending: true,
  });
}

// Preseason games have a different naming convention
function getPreWeekName(weeknum) {
  var weekName;
  if (weeknum == -4) {
    weekName = 'Pre Week 3';
  } else if (weeknum == -3) {
    weekName = 'Pre Week 2';
  } else if (weeknum == -2) {
    weekName = 'Pre Week 1';
  } else if (weeknum == -1) {
    weekName = 'HOF Game';
  }
  return weekName;
}

// Postseason games have a different naming convention
function getPostWeekName(weeknum) {
  var weekName;
  if (weeknum == 19) {
    weekName = 'WildCard';
  } else if (weeknum == 20) {
    weekName = 'Divisional';
  } else if (weeknum == 21) {
    weekName = 'Conference';
  } else if (weeknum == 22) {
    weekName = 'Pro Bowl';
  } else if (weeknum == 23) {
    weekName = 'SuperBowl';
  }
  return weekName;
}

function isWithinMinutesOfGameStart(gameStartTime, minutes) {
  // Parse the provided gameStartTime using JavaScript's Date object
  var gameStart = new Date(gameStartTime);

  // Calculate the time difference between the game start time and the current time
  var timeDifference = gameStart - new Date();

  // Check if the time difference is positive (game has not started) and less than or equal to the specified minutes
  return timeDifference > 0 && timeDifference <= minutes * 60 * 1000; // Convert minutes to milliseconds
}

// Adjust the team score for the spread
// The underdog get the spread points added to their total
function getAdjustedScore(favoredTeam, spread, teamAbbr, teamScore) {
  var adjustedScore;
  // if there is no spread yet, or if the game is even, or if checking for the favored team, no adjustment needed
  if (favoredTeam == '' || spread == '' || spread == 0 || favoredTeam == teamAbbr) {
    adjustedScore = teamScore * 1;
  } else {
    adjustedScore = teamScore * 1 - spread * 1;
  }
  return adjustedScore;
}

function createImage(url, altText, desc) {
  let tempImage = SpreadsheetApp.newCellImage()
    .setSourceUrl(url)
    .setAltTextTitle(altText)
    .setAltTextDescription(desc)
    .build();

  return tempImage;
}

// get all games for the year and return a data set
function allgames() {
  result = [];
  result.push([
    weekName,
    'Date',
    'Time',
    'Away Team',
    'Away',
    'Home Team',
    'Home',
    'Away Score',
    'Home Score',
    'Qtr',
    'Clock',
    'Situation',
    'Pos',
    'Status',
    'Score',
    'Total Points',
    'Game Id',
    'O/U',
    'Odds',
    'Favored Team',
    'Spread',
    'Fav Covered',
    'Box Score Home',
    'Box Score Away',
    'Home Display Name',
    'Away Display Name',
    'Game Winner',
    'Game Loser',
    'Over',
    'Under',
    'Broadcast',
    'Home Off Yds',
    'Away Off Yds',
  ]);

  // using negative numbers for the preseason
  for (var week = -4; week < 24; week++) {
    var weeknum = week;

    // there is no game for week 0
    if (week == 0) {
      continue;
    }

    // preseason games
    if (weeknum < 0) {
      var url = PRESEASON_BASE_URL + SEASON_YEAR + '&week=' + Math.abs(weeknum);
      weekName = getPreWeekName(weeknum);
    }

    // regular season games 1-18
    if (weeknum >= 1 && weeknum <= 18) {
      var url = REGSEASON_BASE_URL + SEASON_YEAR + '&week=' + weeknum;
      var weekName = 'Week ' + weeknum;
    }

    // post season games
    if (weeknum > 18) {
      var url = POSTSEASON_BASE_URL + SEASON_YEAR + '&week=' + (weeknum - 18);
      weekName = getPostWeekName(weeknum);
    }

    // Hit the API, get the data
    var json = UrlFetchApp.fetch(url, options).getContentText();
    var data = JSON.parse(json);

    var games = data['events'];
    if (games === null) {
      result.push([]);
      continue;
    }

    // cycle through all the games in the week
    for (var i = 0; i < games.length; i++) {
      // create a dict (game) with each game as a shortcut
      var game = games[i]['competitions'][0];
      var gameId = games[i]['id'];

      // get the team names, logos, abbrv, and  scores for the game
      var home = game['competitors'][0]['team']['name'];
      var homeScore = game['competitors'][0]['score'];
      var away = game['competitors'][1]['team']['name'];
      var awayScore = game['competitors'][1]['score'];
      var homeabbr = game['competitors'][0]['team']['abbreviation'];
      var awayabbr = game['competitors'][1]['team']['abbreviation'];
      var homeId = game['competitors'][0]['team']['id'];
      var awayId = game['competitors'][1]['team']['id'];
      var homeDisplayName = game['competitors'][0]['team']['displayName'];
      var awayDisplayName = game['competitors'][1]['team']['displayName'];
      var awayLogo = game['competitors'][1]['team']['logo'];
      var homeLogo = game['competitors'][0]['team']['logo'];

      // get game time information for the game
      var gameTime = new Date(game['date']);
      var time = Utilities.formatDate(gameTime, TIMEZONE, 'hh:mm a');
      var date = gameTime;
      datesPlayed.push(date);
      date.toLocaleString('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      });
      var freezeOdds = false;

      if (game['broadcasts'] && game['broadcasts'][0] && game['broadcasts'][0]['names']) {
        var homeBroadcast = game['broadcasts'][0]['names'];
        var awayBroadcast = game['broadcasts'][0]['names'];
      } else {
        var homeBroadcast = '';
        var awayBroadcast = '';
      }

      // get current quarter and time remaining in the game
      var period = game['status']['period'];
      var displayClock = game['status']['displayClock'];
      var gameStatus = game['status']['type']['state'];
      // The ESPN API leaves the quarter as 4 even when the game is over. I prefer "F"
      if (gameStatus == 'post') {
        period = 'F';
      } else if (gameStatus == 'pre') {
        period = 'pre';
      }

      // If the game is in progress, try to get the current down and team with possession
      // ESPN sends an ID for the team with possession, so match it with the right team
      var possessionLogo = '';
      var possessionTeam = '';

      if (gameStatus == 'in') {
        try {
          var situation = game['situation']['downDistanceText'];
          var possessionId = game['situation']['possession'];
          //var lastPlay = game['situation']['lastPlay']['text'];
          var lastPlay = '';
          if (+possessionId == +homeId) {
            var possessionTeam = homeabbr;
            var possessionTeamDesc = home;
          } else if (+possessionId == +awayId) {
            var possessionTeam = awayabbr;
            var possessionTeamDesc = away;
          }
        } catch (err) {
          // sometimes the field is not there, so treat as if there is no current progress
          var situation = 'waiting...';
          var possessionTeam = '';
          var lastPlay = '';
        }
      } else {
        // if the game in not in progress there is no current progress
        var situation = 'waiting...';
        var possessionTeam = '';
        var lastPlay = '';
      }

      var gameWinner = '';
      var gameLoser = '';
      if (gameStatus == 'post') {
        if (game['competitors'][0]['winner'] == true) {
          gameWinner = home;
          gameLoser = away;
        } else if (game['competitors'][1]['winner'] == true) {
          gameWinner = away;
          gameLoser = home;
        } else {
          gameWinner = 'TIE';
          gameLoser = 'TIE';
        }
      }

      // see if there are odds and spreads
      try {
        var overUnder = game['odds'][0]['overUnder'];
        var odds = game['odds'][0]['details'];
        if (odds == 'EVEN') {
          var favoredTeam = '';
          var spread = 0;
        } else {
          var favoredTeam = odds.split(' ')[0];
          var spread = odds.split(' ')[1] * 1;
        }
      } catch (err) {
        var overUnder = '';
        var odds = '';
        var favoredTeam = '';
        var spread = '';
      }

      if (!overUnder) {
        overUnder = '';
      }
      if (!odds) {
        odds = '';
      }

      // Get the minutes value from cell F1 in the "Pick Values" sheet
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pick Values');
      var minutesRange = sheet.getRange('F1'); //
      var minutes = minutesRange.getValue();

      // if the user elected to free the odds before the game, get the number of minutes to
      if (minutes > 0) {
        if (gameStatus == 'pre') {
          if (isWithinMinutesOfGameStart(gameTime, minutes)) {
            var freezeOdds = true;
          } else {
            var freezeOdds = false;
          }
        } else {
          freezeOdds = false;
        }
      }

      try {
        var oldOverUnder = oddsDict[gameId][0];
        if (overUnder == '') {
          overUnder = oldOverUnder;
        }
      } catch {
        overUnder = '';
      }

      try {
        var oldOdds = oddsDict[gameId][1];
        if (odds == '') {
          odds = oldOdds;
          if (odds != '') {
            spread = odds.split(' ')[1] * 1;
            favoredTeam = odds.split(' ')[0];
          }
        }
      } catch {
        overUnder = '';
        spread = '';
        favoredTeam = '';
      }

      if (favoredTeam == 'EVEN') {
        spread = 0;
      }

      var boxHome = [];
      var boxAway = [];
      if (game['competitors'][0]['linescores']) {
        for (g = 0; g < game['competitors'][0]['linescores'].length; g++) {
          boxHome.push(game['competitors'][0]['linescores'][g]['value']);
        }
        boxHome = boxHome.join();
      }
      if (game['competitors'][1]['linescores']) {
        for (f = 0; f < game['competitors'][1]['linescores'].length; f++) {
          boxAway.push(game['competitors'][1]['linescores'][f]['value']);
        }
        boxAway = boxAway.join();
      }

      // get the adjusted score for the spread
      var awayScoreAdjusted = getAdjustedScore(favoredTeam, spread, awayabbr, awayScore);
      var homeScoreAdjusted = getAdjustedScore(favoredTeam, spread, homeabbr, homeScore);
      var favoredTeamCover = '';

      if (gameStatus == 'post' && favoredTeam != '') {
        if (favoredTeam == 'EVEN' && awayScoreAdjusted != homeScoreAdjusted) {
          favoredTeamCover = 'Covered';
        } else if (awayScoreAdjusted > homeScoreAdjusted && awayabbr == favoredTeam) {
          favoredTeamCover = 'Covered';
        } else if (homeScoreAdjusted > awayScoreAdjusted && homeabbr == favoredTeam) {
          favoredTeamCover = 'Covered';
        } else if (awayScoreAdjusted == homeScoreAdjusted) {
          favoredTeamCover = 'Tied';
        } else {
          favoredTeamCover = 'Not Covered';
        }
      }
      // total up the points for over under bets for the game. Multiply *1 to force the datatype
      var totalPoints = awayScore * 1 + homeScore * 1;
      var finalScore = awayabbr + ' ' + awayScore + ' ' + homeabbr + ' ' + homeScore + ' (' + period + ')';

      // Show the adjusted score with spread during the game and after the game. Non-favored team gets the spread points
      if (gameStatus in ['in', 'post']) {
        var finalAdjustedScore =
          awayabbr + ' ' + awayScoreAdjusted + ' ' + homeabbr + ' ' + homeScoreAdjusted + ' (' + period + ')';
      } else {
        var finalAdjustedScore = '';
      }

      var gameFinalOver = 0;
      var gameFinalUnder = 0;
      if (gameStatus == 'post') {
        situation = 'game over';
        if (totalPoints > overUnder) {
          gameFinalOver = 1;
        }
        if (totalPoints < overUnder) {
          gameFinalUnder = 1;
        }
      }

      // reach out to the stats endpoint and get total yards
      var homeTotalYards = '';
      var awayTotalYards = '';
      if (gameStatus == 'post') {
        var url = STATISTICS_BASE_URL + gameId;
        // Hit the API, get the data
        // URL Fetch calls	20,000 / day
        var json = UrlFetchApp.fetch(url, options).getContentText();
        var data = JSON.parse(json);

        var homeTotalYards = getTotalYardsByTeamId(data, homeId);
        var awayTotalYards = getTotalYardsByTeamId(data, awayId);
      }

      var broadcasts = homeBroadcast;

      // push the game data to the result object
      result.push([
        weekName,
        date,
        time,
        away,
        awayabbr,
        home,
        homeabbr,
        awayScore,
        homeScore,
        period,
        displayClock,
        situation,
        possessionTeam,
        gameStatus,
        finalScore,
        totalPoints,
        gameId,
        overUnder,
        odds,
        favoredTeam,
        spread,
        favoredTeamCover,
        boxHome,
        boxAway,
        homeDisplayName,
        awayDisplayName,
        gameWinner,
        gameLoser,
        gameFinalOver,
        gameFinalUnder,
        broadcasts,
        homeTotalYards,
        awayTotalYards,
      ]);
    }
  }
  return result;
}
/////////////////////////////////////////////////////////////////////
// Code below is created by Peter Skowronek https://github.com/1pete3
//
//
/////////////////////////////////////////////////////////////////////
//------------------- Functions for Triggers -------------------
function triggerDeleteAll() {
  const allTriggers = ScriptApp.getProjectTriggers();
  for (let index = 0; index < allTriggers.length; index++) {
    ScriptApp.deleteTrigger(allTriggers[index]);
  }
  console.log('All Triggers Deleted');
}

function triggerCreateGameDay() {
  const dates = [];
  const times = [];

  const curDate = currentDateFormatted();
  const result = Sheets.Spreadsheets.Values.get(
    '1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI',
    'Live Scoring!B51:C334'
  ).values;
  for (let i = 0; i < result.length; i++) {
    if (!dates.includes(result[i][0])) {
      dates.push(result[i][0]);
      times.push(result[i][1]);
    }
  }

  if (dates.includes(curDate)) {
    let gameWindowStartTime = times[dates.indexOf(curDate)];
    console.log(`The first game window starts at ${gameWindowStartTime}`);

    // Splitting curDate into MM:DD:YYYY
    let datePart = curDate.split(' ')[1];
    let parts = datePart.split('/');
    // Extract the hours and minutes
    let timeParts = gameWindowStartTime.split(/[:\s]/);
    let hours = parseInt(timeParts[0], 10);
    let minutes = parseInt(timeParts[1], 10);

    // Convert to 24-hour format if it's PM
    if (timeParts[2] === 'PM' && hours < 12) {
      hours += 12;
    } else if (timeParts[2] === 'AM' && hours === 12) {
      hours = 0; // Midnight case
    }
    // YYYY-MM-DD HH:MM
    let date = `${parts[2]}-${parts[0]}-${parts[1]} ${hours}:${minutes}`;

    ScriptApp.newTrigger('triggerCreateMain').timeBased().at(new Date(date)).create();
  }
}

function triggerCreateMain() {
  let allTriggers = triggerActive();
  console.log(allTriggers.main);

  if (allTriggers.main === undefined) {
    ScriptApp.newTrigger('main').timeBased().everyMinutes(5).create();
    triggerLastGame();
  } else {
    console.log(`Main Trigger already exists ${allTriggers.main.ID}`);
  }
}

function triggerActive() {
  const alltriggerActive = {};
  const allTriggers = ScriptApp.getProjectTriggers();
  const triggerCreateGameDayArr = [];
  for (let i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() == 'triggerCreateGameDay') {
      triggerCreateGameDayArr.push(allTriggers[i].getUniqueId());
    } else {
      alltriggerActive[allTriggers[i].getHandlerFunction()] = [
        {
          Name: allTriggers[i].getHandlerFunction(),
        },
        {
          ID: allTriggers[i].getUniqueId(),
        },
        {
          EventType: allTriggers[i].getEventType(),
        },
      ];
    }
  }
  // The triggerCreateGameDay will have 5 IDs for each weekday an NFL game is played in 2024 ex. Monday
  for (let i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() == 'triggerCreateGameDay') {
      alltriggerActive[allTriggers[i].getHandlerFunction()] = [
        {
          Name: allTriggers[i].getHandlerFunction(),
        },
        {
          ID: triggerCreateGameDayArr,
        },
        {
          EventType: allTriggers[i].getEventType(),
        },
      ];
      break;
    }
  }

  //console.log(alltriggerActive['triggerCreateGameDay'])
  return alltriggerActive;
}

function triggerCheckGameDays() {
  ScriptApp.newTrigger('triggerCreateGameDay').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(9).create();

  ScriptApp.newTrigger('triggerCreateGameDay').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();

  ScriptApp.newTrigger('triggerCreateGameDay').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(9).create();

  ScriptApp.newTrigger('triggerCreateGameDay').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(9).create();

  ScriptApp.newTrigger('triggerCreateGameDay').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(9).create();

  ScriptApp.newTrigger('triggerCreateGameDay').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(9).create();
}

function triggerLastGame() {
  let lastGame = [];
  let activeTriggers = triggerActive();
  let today = new Date();
  let todayStr = today
    .toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(',', '');
  console.log(todayStr);
  if (activeTriggers['main']) {
    //todayStr = 'Sun 11/03/2024'
    console.log(`Main exists`);
    const result = Sheets.Spreadsheets.Values.get(
      '1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI',
      'Live Scoring!B51:Q334'
    ).values;
    for (let i = 0; i < result.length; i++) {
      if (result[i][0] == todayStr) {
        lastGame = result[i];
        console.log(lastGame);
      }
    }
    let addHours = lastGame[1].split(' ');
    let hour = addHours[0].split(':')[0];
    let minute = addHours[0].split(':')[1];
    let formattedHour = Number(hour) + 2;
    let formattedMin = Number(minute) + 14;
    let formattedTime = String(formattedHour) + ':' + String(formattedMin) + ' ' + addHours[1];
    let str = lastGame[0] + ' ' + formattedTime;

    //console.log(`Hour: ${hour} formattedHour:${formattedHour}`)
    //console.log(`Min:${minute} formattedMin:${formattedMin}`)
    //console.log(`FormattedTime:${formattedTime}`)
    // console.log(str)

    if (activeTriggers['triggerDeleteMain']) {
      console.log('triggerDeleteMain exists');
    } else {
      ScriptApp.newTrigger('triggerDeleteMain').timeBased().at(new Date(str)).create();
    }
    return lastGame[15];
  } else {
    console.log(`Main does not exist`);
    return '';
  }
}

function triggerDeleteMain() {
  let lastGameID = triggerLastGame();
  if (lastGameID !== '') {
    ScriptApp.newTrigger('triggerDeleteTriggers').timeBased().everyMinutes(5).create();
  } else {
    console.log('triggerLastGame could not find last game');
  }
}

function triggerDeleteTriggers() {
  let lastGameID = triggerLastGame();
  const allTriggers = ScriptApp.getProjectTriggers();
  const result = Sheets.Spreadsheets.Values.get(
    '1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI',
    'Live Scoring!B51:Q334'
  ).values;
  for (let i = 0; i < result.length; i++) {
    if (result[i][15] === lastGameID && result[i][10] === 'game over') {
      for (let j = 0; j < allTriggers.length; j++) {
        if (allTriggers[j].getHandlerFunction() !== 'triggerCreateGameDay') {
          ScriptApp.deleteTrigger(allTriggers[j]);
        }
      }
    }
  }
}

// ------------------- End of Trigger Functions -------------------

// Returns a dictonary that contains an array of arrays that looks like
/*
  'Week 15': 
   [ [ 'Thu 12/12/2024', '8:15 PM' ],
     [ 'Sun 12/15/2024', '1:00 PM' ],
     [ 'Sun 12/15/2024', '4:25 PM' ],
     [ 'Sun 12/15/2024', '8:20 PM' ],
     [ 'Mon 12/16/2024', '8:00 PM' ],
     [ 'Mon 12/16/2024', '8:30 PM' ] ],
 */
function getSchedule() {
  week = {};
  currentTime = new Date();
  for (let j = 1; j <= 18; j++) {
    week['Week ' + j] = [];
  }
  week['WildCard'] = [];
  week['Divisional'] = [];
  week['Conference'] = [];
  week['SuperBowl'] = [];

  try {
    const result = Sheets.Spreadsheets.Values.get(
      '1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI',
      'Live Scoring!A51:C334'
    ).values;
    for (let i = 0; i < result.length; i++) {
      let currentWeek = result[i][0].toString();
      week[currentWeek].push([result[i][1], result[i][2]]);
    }
  } catch (err) {
    // TODO (developer) - Handle exception
    console.log('Failed with error %s', err.message);
  }
  //console.log(week)
  // clean up the data

  const objKeys = Object.keys(week);
  for (let j = 0; j < objKeys.length; j++) {
    let uniqueData = Array.from(new Set(week[objKeys[j]].map(JSON.stringify))).map(JSON.parse);
    week[objKeys[j]] = {};
    week[objKeys[j]] = uniqueData;
  }
  return week;
}

function getCurrentWeek() {
  const result = Sheets.Spreadsheets.Values.get(
    '1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI',
    'Live Scoring!A51:C334'
  ).values;
  const curDate = currentDateFormatted();

  for (let i = 0; i < result.length; i++) {
    const date = result[i][1];
    const week = result[i][0];
    if (new Date(date) >= new Date(curDate)) {
      console.log(`It's currently ${week}, here's the game times`);
      console.log(getSchedule()[week]);
      return getSchedule()[week];
    }
  }
}

function currentDateFormatted() {
  const currentDate = new Date();
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formattedDate = currentDate.toLocaleDateString('en-US', options);
  const splitVal = formattedDate.split(',');
  const curDate = splitVal[0] + splitVal[1];
  console.log(`Current Date ${curDate}`);
  return curDate;
}
